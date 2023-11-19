import logo from './logo.svg';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Earth Classifier</h1>

        {/* GeoJSON Upload Section */}
        <div className="upload-section">
          <h2>Upload GeoJSON</h2>
          <p>Man kann entweder Dateien hochladen oder das Textfeld nutzen.</p>
          <div>
            <label>Dateien hochladen:</label>
            <input type="file" id="geojson-file-input" />
            <button className="btn btn-primary" onClick={() => uploadGeoJSON()}>Upload GeoJSON</button>
          </div>
          <div>
            <label>Textfeld nutzen:</label>
            <textarea id="data-input" rows="4" cols="50" placeholder="Enter data..."></textarea>
            <button className="btn btn-primary" onClick={() => saveData()}>Save Data</button>
          </div>
        </div>

      </header>
      {/* Footer */}
      <footer className="bg-light text-center text-lg-start mt-4">
        <div className="text-center p-3" style={{ backgroundColor: '#f8f9fa' }}>
          © 2023 Sonja, Simon, Inka, Elena, Arne
        </div>
      </footer>
    </div>
  );
}

// Placeholder functions
function uploadGeoJSON() {
  console.log('Upload GeoJSON logic');
}

function saveData() {
  console.log('Save Data logic');
}

export default App;
