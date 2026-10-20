import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, ArrowRight, BookOpen, CheckCircle2, CircleHelp, Clock3, Code2, History, Play, RotateCcw, SkipForward, Sparkles, Trash2 } from 'lucide-react';

const API = 'http://127.0.0.1:5000/api';
const ALGORITHMS = [
  { value: 'bubble_sort', label: 'Bubble Sort', type: 'Sorting', time: 'O(n²)', space: 'O(1)', description: 'Repeatedly compares neighboring values and swaps them when they are in the wrong order.' },
  { value: 'selection_sort', label: 'Selection Sort', type: 'Sorting', time: 'O(n²)', space: 'O(1)', description: 'Finds the smallest remaining value and places it at the next position.' },
  { value: 'linear_search', label: 'Linear Search', type: 'Searching', time: 'O(n)', space: 'O(1)', description: 'Checks each value from left to right until the target is found.' },
  { value: 'binary_search', label: 'Binary Search', type: 'Searching', time: 'O(log n)', space: 'O(1)', description: 'Checks the middle value and repeatedly halves the search range. Input is sorted automatically.' },
];

function App() {
  const [algorithm, setAlgorithm] = useState('bubble_sort');
  const [input, setInput] = useState('8, 3, 6, 1, 5');
  const [targetInput, setTargetInput] = useState('6');
  const [error, setError] = useState('');
  const [runData, setRunData] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState('visualizer');
  const timerRef = useRef(null);

  const selected = ALGORITHMS.find(a => a.value === algorithm);
  const currentStep = runData?.steps?.[stepIndex];
  const isSearch = algorithm.endsWith('search');

  useEffect(() => { loadHistory(); return () => clearInterval(timerRef.current); }, []);

  useEffect(() => {
    if (!playing || !runData) return;
    timerRef.current = setInterval(() => {
      setStepIndex(previous => {
        if (previous >= runData.steps.length - 1) {
          clearInterval(timerRef.current);
          setPlaying(false);
          return previous;
        }
        return previous + 1;
      });
    }, 750);
    return () => clearInterval(timerRef.current);
  }, [playing, runData]);

  async function loadHistory() {
    try {
      const response = await fetch(`${API}/history`);
      if (!response.ok) throw new Error('Could not load history');
      setHistory(await response.json());
    } catch {
      // The backend may not have started yet; the main page remains usable.
    }
  }

  function parseValues() {
    const raw = input.trim();
    if (!raw) throw new Error('Please enter at least one number.');
    const parts = raw.split(',');
    if (parts.some(part => part.trim() === '')) throw new Error('Separate numbers with commas; do not leave an empty value.');
    if (parts.length > 20) throw new Error('Please enter no more than 20 numbers.');
    // const values = parts.map(part => {
    //   const trimmed = part.trim();
    //   if (!/^-?\\d+$/.test(trimmed)) throw new Error(`"${trimmed}" is not a valid integer.`);
    //   const value = Number(trimmed);
    //   if (!Number.isSafeInteger(value) || value < -9999 || value > 9999) throw new Error('Each number must be between -9999 and 9999.');
    //   return value;
    // });



    const values = parts.map(part => {
      const trimmed = part.trim();
      
      // Convert directly and check if it's a valid finite number/integer
      const value = Number(trimmed);
      if (isNaN(value) || !Number.isInteger(value)) {
        throw new Error(`"${trimmed}" is not a valid integer.`);
      }
      
      if (value < -9999 || value > 9999) {
        throw new Error('Each number must be between -9999 and 9999.');
      }
      return value;
    });
    return values;
  }

  async function runAlgorithm(event) {
    event?.preventDefault();
    setError('');
    setPlaying(false);
    clearInterval(timerRef.current);
    setLoading(true);
    try {
      const values = parseValues();
      let target;
      // if (isSearch) {
      //   if (!/^-?\\d+$/.test(targetInput.trim())) throw new Error('Please enter a valid integer search target.');
      //   target = Number(targetInput.trim());
      //   if (!Number.isSafeInteger(target) || target < -9999 || target > 9999) throw new Error('Search target must be between -9999 and 9999.');
      // }


      
      if (isSearch) {
        const trimmedTarget = targetInput.trim();
        target = Number(trimmedTarget);
        if (isNaN(target) || !Number.isInteger(target)) {
          throw new Error('Please enter a valid integer search target.');
        }
        if (!Number.isSafeInteger(target) || target < -9999 || target > 9999) {
          throw new Error('Search target must be between -9999 and 9999.');
        }
      }


      const response = await fetch(`${API}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ algorithm, values, ...(isSearch ? { target } : {}) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to run algorithm.');
      setRunData(data);
      setStepIndex(0);
      setActiveTab('visualizer');
      await loadHistory();
    } catch (err) {
      setError(err.message || 'Something went wrong. Make sure the Flask backend is running.');
    } finally {
      setLoading(false);
    }
  }

  function resetSteps() {
    setPlaying(false);
    clearInterval(timerRef.current);
    setStepIndex(0);
  }

  function nextStep() {
    if (!runData) return;
    setPlaying(false);
    clearInterval(timerRef.current);
    setStepIndex(previous => Math.min(previous + 1, runData.steps.length - 1));
  }

  async function clearHistory() {
    try {
      const response = await fetch(`${API}/history`, { method: 'DELETE' });
      if (!response.ok) throw new Error();
      setHistory([]);
    } catch {
      setError('Could not clear history. Check that the backend is running.');
    }
  }

  const progress = runData ? ((stepIndex + 1) / runData.steps.length) * 100 : 0;
  const valuesToDisplay = currentStep?.array || [];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-icon"><Code2 size={22} /></div><div><strong>AlgoArena</strong><span>LEARN BY VISUALIZING</span></div></div>
        <div className="side-label">WORKSPACE</div>
        <button className={`nav-item ${activeTab === 'visualizer' ? 'active' : ''}`} onClick={() => setActiveTab('visualizer')}><Activity size={18} /> Algorithm Lab</button>
        <button className={`nav-item ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}><History size={18} /> Run History <span className="nav-count">{history.length}</span></button>
        <div className="side-label learn-label">LEARN</div>
        <div className="learn-card"><div className="learn-card-icon"><BookOpen size={17} /></div><strong>Understand the steps</strong><p>Watch algorithms work one move at a time.</p></div>
        <div className="sidebar-bottom"><div className="status-dot"></div><span>Local learning environment</span></div>
      </aside>

      <main className="main-area">
        <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <strong>{activeTab === 'history' ? 'Run History' : 'Algorithm Lab'}</strong></div><div className="topbar-right"><span className="api-status"><i></i> Interactive learning</span><div className="avatar">AA</div></div></header>
        {activeTab === 'history' ? (
          <section className="page-content">
            <div className="page-heading"><div><div className="eyebrow">YOUR ACTIVITY</div><h1>Run history</h1><p>Review your recent algorithm experiments.</p></div><button className="button secondary" onClick={clearHistory} disabled={!history.length}><Trash2 size={16} /> Clear history</button></div>
            <HistoryPanel history={history} />
            <button className="text-button" onClick={() => setActiveTab('visualizer')}>← Back to Algorithm Lab</button>
          </section>
        ) : (
          <section className="page-content">
            <div className="hero"><div className="hero-copy"><div className="eyebrow"><Sparkles size={14} /> ALGORITHM PLAYGROUND</div><h1>Make algorithms<br /><span>come to life.</span></h1><p>Explore sorting and searching visually. Change the input, step through each operation, and understand how the algorithm thinks.</p><div className="hero-tags"><span><CheckCircle2 size={14} /> Step-by-step</span><span><CheckCircle2 size={14} /> Input validation</span><span><CheckCircle2 size={14} /> Complexity insights</span></div></div><div className="hero-art" aria-hidden="true"><div className="orbit orbit-one"></div><div className="orbit orbit-two"></div><div className="art-bars"><i style={{height:'34%'}}></i><i style={{height:'70%'}}></i><i style={{height:'49%'}}></i><i style={{height:'88%'}}></i><i style={{height:'58%'}}></i><i style={{height:'100%'}}></i><i style={{height:'43%'}}></i></div><div className="art-chip">O(n log n)</div></div></div>

            <div className="section-title"><div><span className="section-number">01</span><h2>Choose an algorithm</h2></div><span className="section-hint">Select a method to explore</span></div>
            <div className="algorithm-grid">{ALGORITHMS.map((item, index) => <button key={item.value} className={`algorithm-card ${algorithm === item.value ? 'selected' : ''}`} onClick={() => { setAlgorithm(item.value); setError(''); setRunData(null); setStepIndex(0); setPlaying(false); }}><div className={`algorithm-symbol symbol-${index}`}>{item.type === 'Sorting' ? <Activity size={19} /> : <CircleHelp size={19} />}</div><div className="algorithm-card-main"><div className="card-topline"><span>{item.type}</span>{algorithm === item.value && <CheckCircle2 size={16} className="selected-check" />}</div><strong>{item.label}</strong><p>{item.description}</p><div className="complexity-row"><span>Time <b>{item.time}</b></span><span>Space <b>{item.space}</b></span></div></div></button>)}</div>

            <div className="section-title input-section-title"><div><span className="section-number">02</span><h2>Configure your input</h2></div><span className="section-hint">Maximum 20 integers</span></div>
            <form className="input-panel" onSubmit={runAlgorithm} noValidate>
              <div className="form-fields"><label className="field-label">Array values <span>Required</span><input value={input} onChange={e => setInput(e.target.value)} placeholder="e.g. 8, 3, 6, 1, 5" aria-describedby="array-help" /></label><div className="field-help" id="array-help">Enter integers separated by commas. Range: -9999 to 9999.</div>
              {isSearch && <label className="field-label target-field">Search target <span>Required</span><input value={targetInput} onChange={e => setTargetInput(e.target.value)} placeholder="Enter target number" inputMode="numeric" /></label>}
              <div className="form-footer"><div className="validation-note"><CheckCircle2 size={15} /> Input is validated in your browser and on the server.</div><button className="button primary" type="submit" disabled={loading}>{loading ? 'Running...' : 'Run algorithm'} <ArrowRight size={17} /></button></div></div>
              {error && <div className="error-message" role="alert">{error}</div>}
            </form>

            <div className="section-title visual-title"><div><span className="section-number">03</span><h2>Live visualization</h2></div>{runData && <span className="step-counter">Step {stepIndex + 1} of {runData.steps.length}</span>}</div>
            <div className="visual-panel">
              {!runData ? <div className="empty-state"><div className="empty-icon"><Activity size={25} /></div><strong>Your visualization will appear here</strong><p>Select an algorithm, enter your values, and click “Run algorithm”.</p><div className="sample-bars"><i style={{height:'30%'}}></i><i style={{height:'66%'}}></i><i style={{height:'44%'}}></i><i style={{height:'86%'}}></i><i style={{height:'56%'}}></i><i style={{height:'72%'}}></i></div></div> : <>
                <div className="visual-meta"><div><span className="mini-label">CURRENT OPERATION</span><strong>{selected.label}</strong></div><div className="visual-legend"><span><i className="legend-active"></i> Active</span><span><i className="legend-normal"></i> Other values</span></div></div>
                <div className="bars-area">{valuesToDisplay.map((value, index) => { const maxAbs = Math.max(1, ...valuesToDisplay.map(v => Math.abs(v))); const height = Math.max(12, Math.abs(value) / maxAbs * 150); const active = currentStep?.active?.includes(index); const isFound = currentStep?.found && active; return <div className="bar-column" key={`${index}-${value}`}><div className={`bar-value ${isFound ? 'found-text' : ''}`}>{value}</div><div className={`bar ${active ? (isFound ? 'found' : 'active') : ''}`} style={{height: `${height}px`}} title={`Index ${index}: ${value}`}></div><span className="bar-index">{index}</span></div>; })}</div>
                <div className="step-message"><span className="message-pulse"></span><span>{currentStep?.message}</span></div>
                <div className="progress-track"><div style={{width: `${progress}%`}}></div></div>
                <div className="control-row"><button className="button secondary" onClick={resetSteps}><RotateCcw size={15} /> Reset</button><div className="play-controls"><button className="button secondary" onClick={() => {setPlaying(false); clearInterval(timerRef.current); setStepIndex(p => Math.max(0,p-1));}} disabled={stepIndex === 0}>Previous</button><button className="button primary" onClick={() => stepIndex === runData.steps.length - 1 ? resetSteps() : setPlaying(p => !p)}>{playing ? 'Pause' : stepIndex === runData.steps.length - 1 ? 'Replay' : <><Play size={15} /> Play</>}</button><button className="button secondary" onClick={nextStep} disabled={stepIndex === runData.steps.length - 1}><SkipForward size={15} /> Next</button></div></div>
                <div className="result-strip"><div><span className="mini-label">RESULT</span><strong>{runData.result}</strong></div><div className="result-complexity"><span>Time <b>{runData.complexity.time}</b></span><span>Space <b>{runData.complexity.space}</b></span></div></div>
              </>}
            </div>

            <div className="bottom-grid"><div className="info-card"><div className="info-card-title"><BookOpen size={17} /><strong>How it works</strong></div><p>{selected.description}</p><button className="text-button" onClick={() => setActiveTab('history')}>View previous runs <ArrowRight size={14} /></button></div><div className="info-card"><div className="info-card-title"><Clock3 size={17} /><strong>Recent runs</strong></div>{history.length ? history.slice(0, 3).map(item => <div className="recent-item" key={item.id}><span>{item.algorithm.replace('_', ' ').replace('_', ' ')}</span><small>{item.steps_count} steps</small></div>) : <p>Your recent runs will show here after you run an algorithm.</p>}<button className="text-button" onClick={() => setActiveTab('history')}>Open run history <ArrowRight size={14} /></button></div></div>
            <footer className="footer"><span>AlgoArena · Interactive Algorithm Visualizer</span><span>Built with React, Flask & SQLite</span></footer>
          </section>
        )}
      </main>
    </div>
  );
}

function HistoryPanel({ history }) {
  if (!history.length) return <div className="history-empty"><History size={28} /><strong>No runs saved yet</strong><p>Run an algorithm from the Algorithm Lab and it will appear here.</p></div>;
  return <div className="history-list">{history.map(item => <div className="history-row" key={item.id}><div className="history-icon"><Code2 size={18} /></div><div className="history-main"><strong>{item.algorithm.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</strong><p>Input: {item.input_values.join(', ')}{item.target !== null ? ` · Target: ${item.target}` : ''}</p><small>{item.created_at}</small></div><div className="history-result"><strong>{item.steps_count} steps</strong><span>{item.result}</span></div></div>)}</div>;
}

export default App;
