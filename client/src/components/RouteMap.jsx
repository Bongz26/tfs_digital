import React, { useEffect, useRef, useState } from "react";
import { getDirections } from "../api/directions";

/**
 * RouteMap Component
 * Displays a route on Google Maps
 * 
 * @param {string} origin - Starting location
 * @param {string} destination - Ending location
 * @param {string[]} waypoints - Optional intermediate points
 * @param {string} apiKey - Google Maps API key (should be from env or config)
 * @param {object} routeData - Optional pre-fetched route data
 */
const RouteMap = ({ 
  origin, 
  destination, 
  waypoints = [], 
  routeData = null,
  height = "400px",
  zoom = 10
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [directions, setDirections] = useState(routeData);
  const scriptLoadedRef = useRef(false);
  const initCallbackRef = useRef(null);

  useEffect(() => {
    // Check if API key is configured
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setError("Google Maps API key not configured. Please set REACT_APP_GOOGLE_MAPS_API_KEY in client/.env file");
      setLoading(false);
      return;
    }

    // Check if already fully loaded and initialized
    if (window.google && window.google.maps && typeof window.google.maps.Map === 'function' && typeof window.google.maps.DirectionsRenderer === 'function') {
      scriptLoadedRef.current = true;
      // Use setTimeout to ensure DOM is ready
      setTimeout(() => {
        initializeMap();
      }, 50);
      return;
    }

    // Check if script is already in the DOM
    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    
    if (existingScript) {
      // Script is loading - wait for it with polling
      const checkLoaded = setInterval(() => {
        if (window.google && window.google.maps && typeof window.google.maps.Map === 'function') {
          clearInterval(checkLoaded);
          scriptLoadedRef.current = true;
          initializeMap();
        }
      }, 100);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkLoaded);
        if (!window.google || !window.google.maps || typeof window.google.maps.Map !== 'function') {
          setError("Google Maps API took too long to load. Please refresh the page.");
          setLoading(false);
        }
      }, 10000);
      
      return () => clearInterval(checkLoaded);
    }

    // Create unique callback name
    const callbackName = `initGoogleMaps_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Set up global callback
    window[callbackName] = () => {
      delete window[callbackName];
      scriptLoadedRef.current = true;
      console.log("✅ Google Maps API initialized via callback");
      // Small delay to ensure everything is ready
      setTimeout(() => {
        initializeMap();
      }, 100);
    };

    initCallbackRef.current = callbackName;

    // Load script with callback
    try {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry&callback=${callbackName}`;
      script.async = true;
      script.defer = true;
      
      script.onerror = (e) => {
        console.error("❌ Error loading Google Maps API:", e);
        if (window[callbackName]) delete window[callbackName];
        setError("Failed to load Google Maps API. Check your API key in client/.env file and make sure Maps JavaScript API is enabled in Google Cloud Console.");
        setLoading(false);
      };

      // Add error handler for authentication failures
      window.gm_authFailure = () => {
        console.error("❌ Google Maps authentication failed - check your API key");
        setError("Google Maps API authentication failed. Please check your API key in client/.env file.");
        setLoading(false);
      };

      document.head.appendChild(script);
    } catch (err) {
      console.error("❌ Error creating Google Maps script:", err);
      if (window[initCallbackRef.current]) delete window[initCallbackRef.current];
      setError("Failed to create Google Maps script: " + err.message);
      setLoading(false);
    }

    return () => {
      // Cleanup callback if component unmounts
      if (initCallbackRef.current && window[initCallbackRef.current]) {
        delete window[initCallbackRef.current];
      }
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
      }
    };
  }, []);

  useEffect(() => {
    if (directions && mapInstanceRef.current) {
      displayRoute();
    } else if (origin && destination && !directions && mapInstanceRef.current) {
      fetchDirections();
    }
  }, [directions, origin, destination, waypoints]);

  const initializeMap = () => {
    if (!mapRef.current) {
      console.warn("Map ref not available yet");
      return;
    }

    // Check if Google Maps API is fully loaded and initialized
    if (!window.google || !window.google.maps || typeof window.google.maps.Map !== 'function') {
      console.error("Google Maps API not fully loaded", {
        google: !!window.google,
        maps: !!window.google?.maps,
        Map: typeof window.google?.maps?.Map
      });
      setError("Google Maps API failed to load properly. Please refresh the page.");
      setLoading(false);
      return;
    }

    try {
      // Initialize map
      const map = new window.google.maps.Map(mapRef.current, {
        zoom: zoom,
        center: { lat: -28.5, lng: 28.0 }, // Default to Free State, South Africa
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true
      });

      mapInstanceRef.current = map;

      // Initialize directions renderer
      const directionsRenderer = new window.google.maps.DirectionsRenderer({
        map: map,
        suppressMarkers: false,
        polylineOptions: {
          strokeColor: "#FF0000",
          strokeWeight: 4,
          strokeOpacity: 0.8
        }
      });

      directionsRendererRef.current = directionsRenderer;

      // Fetch or display directions
      if (directions) {
        displayRoute();
      } else if (origin && destination) {
        fetchDirections();
      } else {
        setLoading(false);
        // If no origin/destination, just show an empty map
        setError(null);
      }
    } catch (err) {
      console.error("Error initializing map:", err);
      setError("Failed to initialize map");
      setLoading(false);
    }
  };

  const fetchDirections = async () => {
    if (!origin || !destination) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getDirections(origin, destination, waypoints);
      
      if (data.success) {
        setDirections(data);
        displayRoute();
      } else {
        setError(data.error || "Failed to get directions");
      }
    } catch (err) {
      console.error("Error fetching directions:", err);
      setError(err.response?.data?.error || "Failed to fetch directions");
    } finally {
      setLoading(false);
    }
  };

  const displayRoute = () => {
    if (!directions || !mapInstanceRef.current) {
      console.warn("Cannot display route: missing directions or map instance");
      return;
    }

    if (!directionsRendererRef.current) {
      console.warn("DirectionsRenderer not initialized yet");
      return;
    }

    try {
      // Simplest and most reliable: Use DirectionsService to get properly formatted route
      // This ensures compatibility and avoids manual conversion issues
      if (origin && destination) {
        const directionsService = new window.google.maps.DirectionsService();
        
        const request = {
          origin: origin,
          destination: destination,
          travelMode: window.google.maps.TravelMode.DRIVING
        };

        // Add waypoints if provided
        if (waypoints && waypoints.length > 0) {
          request.waypoints = waypoints.map(wp => ({
            location: wp,
            stopover: true
          }));
        }

        directionsService.route(request, (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK) {
            if (directionsRendererRef.current) {
              directionsRendererRef.current.setDirections(result);
            }
            if (result.routes && result.routes[0] && mapInstanceRef.current) {
              mapInstanceRef.current.fitBounds(result.routes[0].bounds);
            }
            setLoading(false);
          } else {
            console.error("Directions request failed:", status);
            setError("Failed to display route: " + status);
            setLoading(false);
            
            // Fallback: Try to show route using polyline if available
            if (directions.polyline && window.google.maps.geometry) {
              try {
                const decodedPath = window.google.maps.geometry.encoding.decodePath(directions.polyline);
                if (decodedPath && decodedPath.length > 0) {
                  const routePolyline = new window.google.maps.Polyline({
                    path: decodedPath,
                    geodesic: true,
                    strokeColor: "#FF0000",
                    strokeOpacity: 0.8,
                    strokeWeight: 4
                  });
                  routePolyline.setMap(mapInstanceRef.current);
                  
                  const bounds = new window.google.maps.LatLngBounds();
                  decodedPath.forEach(point => bounds.extend(point));
                  mapInstanceRef.current.fitBounds(bounds);
                  setLoading(false);
                }
              } catch (polyErr) {
                console.error("Failed to decode polyline:", polyErr);
              }
            }
          }
        });
      } else {
        // If no origin/destination, try using polyline from backend
        if (directions.polyline && window.google.maps.geometry && mapInstanceRef.current) {
          try {
            const decodedPath = window.google.maps.geometry.encoding.decodePath(directions.polyline);
            if (decodedPath && decodedPath.length > 0) {
              const routePolyline = new window.google.maps.Polyline({
                path: decodedPath,
                geodesic: true,
                strokeColor: "#FF0000",
                strokeOpacity: 0.8,
                strokeWeight: 4
              });
              routePolyline.setMap(mapInstanceRef.current);
              
              const bounds = new window.google.maps.LatLngBounds();
              decodedPath.forEach(point => bounds.extend(point));
              mapInstanceRef.current.fitBounds(bounds);
              setLoading(false);
            }
          } catch (polyErr) {
            console.error("Failed to decode polyline:", polyErr);
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      }
    } catch (err) {
      console.error("Error displaying route:", err);
      setError("Failed to display route on map: " + err.message);
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="w-full bg-red-50 border border-red-200 rounded-lg p-4" style={{ height }}>
        <p className="text-red-600 font-semibold">⚠️ Error</p>
        <p className="text-red-700 text-sm mt-1">{error}</p>
        {error.includes("API key") && (
          <div className="mt-3 text-xs text-red-600">
            <p className="font-semibold">To fix:</p>
            <ol className="list-decimal list-inside space-y-1 mt-1">
              <li>Create <code className="bg-red-100 px-1 rounded">client/.env</code> file</li>
              <li>Add: <code className="bg-red-100 px-1 rounded">REACT_APP_GOOGLE_MAPS_API_KEY=your-key</code></li>
              <li>Restart React dev server (Ctrl+C, then npm start)</li>
            </ol>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full" style={{ height }}>
      {loading && (
        <div className="absolute inset-0 bg-gray-100 bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-800 mx-auto mb-2"></div>
            <p className="text-gray-600">Loading map...</p>
          </div>
        </div>
      )}
      
      {directions && !loading && (
        <div className="absolute top-2 left-2 bg-white p-2 rounded shadow-md z-10 text-sm">
          <p className="font-semibold">📍 Route Info</p>
          <p className="text-xs text-gray-600">Distance: {directions.distance}</p>
          <p className="text-xs text-gray-600">Duration: {directions.duration}</p>
        </div>
      )}
      
      <div ref={mapRef} className="w-full h-full rounded-lg" style={{ minHeight: "300px" }} />
    </div>
  );
};

export default RouteMap;

