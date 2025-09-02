
import { useState } from 'react';
function App() {
  const [prompt, setPrompt] = useState('');
  const [trackUrl, setTrackUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const generateTrack = async () => {
    setLoading(true);
    const res = await fetch('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    const data = await res.json();
    setTrackUrl(data.trackUrl);
    setLoading(false);
    new Audio(data.trackUrl).play();
  }

  return (
    <div className="min-h-screen bg-[#121212] flex flex-col items-center justify-center text-white p-4">
      <h1 className="text-4xl font-bold mb-6">Suno AI Clone</h1>
      <div className="flex items-center space-x-2">
        <input
          className="p-3 rounded-md text-black w-80 focus:ring-2 focus:ring-[#1DB954] transition"
          placeholder="Type your prompt..."
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
        />
        <button
          className="bg-[#1DB954] px-6 py-3 rounded-md hover:bg-green-600 transition"
          onClick={generateTrack}
          disabled={loading}
        >
          {loading ? 'Generating...' : 'Generate'}
        </button>
      </div>
      {trackUrl && <p className="mt-4 break-all">Track: {trackUrl}</p>}
    </div>
  );
}
export default App;
