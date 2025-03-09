import React, { useState, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import * as toGeoJSON from '@tmcw/togeojson';

// Fix for Leaflet icon issue
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function App() {
  const [kmlData, setKmlData] = useState(null);
  const [geoJsonData, setGeoJsonData] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [elementCounts, setElementCounts] = useState({});
  const [elementDetails, setElementDetails] = useState([]);
  const fileInputRef = useRef(null);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const kmlString = e.target.result;
        const parser = new DOMParser();
        const kmlDoc = parser.parseFromString(kmlString, 'text/xml');
        setKmlData(kmlDoc);

        // Convert KML to GeoJSON
        const geoJson = toGeoJSON.kml(kmlDoc);
        setGeoJsonData(geoJson);

        // Process the data for summary and details
        processKmlData(kmlDoc, geoJson);
      };
      reader.readAsText(file);
    }
  };

  const processKmlData = (kmlDoc, geoJson) => {
    // Count different element types
    const counts = {
      Placemark: kmlDoc.getElementsByTagName('Placemark').length,
      Point: kmlDoc.getElementsByTagName('Point').length,
      LineString: kmlDoc.getElementsByTagName('LineString').length,
      Polygon: kmlDoc.getElementsByTagName('Polygon').length,
      MultiGeometry: kmlDoc.getElementsByTagName('MultiGeometry').length,
    };
    setElementCounts(counts);

    // Calculate lengths for line elements
    const details = [];
    if (geoJson && geoJson.features) {
      geoJson.features.forEach((feature, index) => {
        if (feature.geometry) {
          const type = feature.geometry.type;
          let length = 0;

          if (type === 'LineString' || type === 'MultiLineString') {
            length = calculateLength(feature);
            details.push({
              id: index,
              type,
              name: feature.properties.name || `Element ${index}`,
              length: length.toFixed(2) + ' meters'
            });
          } else if (type === 'Point') {
            details.push({
              id: index,
              type,
              name: feature.properties.name || `Element ${index}`,
              coordinates: `${feature.geometry.coordinates[0]}, ${feature.geometry.coordinates[1]}`
            });
          } else if (type === 'Polygon') {
            details.push({
              id: index,
              type,
              name: feature.properties.name || `Element ${index}`,
              area: calculateArea(feature).toFixed(2) + ' sq meters'
            });
          }
        }
      });
    }
    setElementDetails(details);
  };

  const calculateLength = (feature) => {
    // Simple length calculation for LineString
    if (feature.geometry.type === 'LineString') {
      let length = 0;
      const coords = feature.geometry.coordinates;
      for (let i = 0; i < coords.length - 1; i++) {
        length += distance(
          coords[i][1], coords[i][0],
          coords[i + 1][1], coords[i + 1][0]
        );
      }
      return length;
    }
    // For MultiLineString, calculate each line and sum
    else if (feature.geometry.type === 'MultiLineString') {
      let totalLength = 0;
      feature.geometry.coordinates.forEach(line => {
        for (let i = 0; i < line.length - 1; i++) {
          totalLength += distance(
            line[i][1], line[i][0],
            line[i + 1][1], line[i + 1][0]
          );
        }
      });
      return totalLength;
    }
    return 0;
  };

  const calculateArea = (feature) => {
    // Simple area calculation for Polygon
    if (feature.geometry.type === 'Polygon') {
      // This is a very simplified calculation
      // For more accuracy, you should use a library like turf.js
      return 0; // Placeholder
    }
    return 0;
  };

  // Haversine formula to calculate distance between two points
  const distance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Radius of the earth in meters
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in meters
    return d;
  };

  const deg2rad = (deg) => {
    return deg * (Math.PI / 180);
  };

  const toggleSummary = () => {
    setShowSummary(!showSummary);
    if (showDetails) setShowDetails(false);
  };

  const toggleDetails = () => {
    setShowDetails(!showDetails);
    if (showSummary) setShowSummary(false);
  };

  return (
    <div className="container">
      <h1 className="heading">KML Map Viewer</h1>

      <div className="button-group">
        <input
          type="file"
          accept=".kml"
          onChange={handleFileUpload}
          ref={fileInputRef}
          className="file-input"
        />
        <button
          onClick={() => fileInputRef.current.click()}
          className="button"
        >
          Upload KML File
        </button>

        <button
          onClick={toggleSummary}
          className={`button ${showSummary ? 'button-active' : ''}`}
          disabled={!kmlData}
        >
          Summary
        </button>

        <button
          onClick={toggleDetails}
          className={`button ${showDetails ? 'button-active' : ''}`}
          disabled={!kmlData}
        >
          Details
        </button>
      </div>

      {showSummary && kmlData && (
        <div className="panel">
          <h2 className="heading">KML Summary</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Element Type</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(elementCounts).map(([type, count]) => (
                count > 0 && (
                  <tr key={type}>
                    <td>{type}</td>
                    <td>{count}</td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showDetails && kmlData && (
        <div className="panel">
          <h2 className="heading">KML Details</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Metrics</th>
              </tr>
            </thead>
            <tbody>
              {elementDetails.map((element) => (
                <tr key={element.id}>
                  <td>{element.name}</td>
                  <td>{element.type}</td>
                  <td>
                    {element.length ? `Length: ${element.length}` :
                      element.area ? `Area: ${element.area}` :
                        element.coordinates ? `Coordinates: ${element.coordinates}` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {geoJsonData ? (
        <div className="map-container">
          <MapContainer
            center={[0, 0]}
            zoom={2}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.Surajgpes@gmail.com">Suraj_Kumar</a>9667965269'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <GeoJSON
              data={geoJsonData}
              style={(feature) => {
                switch (feature.geometry.type) {
                  case 'LineString':
                  case 'MultiLineString':
                    return { color: '#ff7800', weight: 3, opacity: 0.7 };
                  case 'Polygon':
                  case 'MultiPolygon':
                    return { fillColor: '#3388ff', weight: 2, opacity: 1, color: '#222', fillOpacity: 0.5 };
                  default:
                    return { color: '#3388ff' };
                }
              }}
              onEachFeature={(feature, layer) => {
                const popupContent = feature.properties.name ||
                  feature.properties.description ||
                  `${feature.geometry.type} Element`;
                layer.bindPopup(popupContent);
              }}
            />
          </MapContainer>
        </div>
      ) : (
        <div className="map-placeholder">
          <p className="placeholder-text">Upload a KML file to view the map</p>
        </div>
      )}
    </div>
  );
}

export default App;