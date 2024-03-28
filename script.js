mapboxgl.accessToken = 'pk.eyJ1Ijoiem9lbGluMTEyMiIsImEiOiJjbDZlNzBpaWEwMHR3M2VzZTFtbjc0azlkIn0.8zDjJUVT6PoiR8tj6Re7bA';

var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11', // Replace with your preferred Mapbox style
    center: [-74.006, 40.7128], // Centered at NYC coordinates
    zoom: 10 // Adjust zoom level as needed
});

map.on('load', function () {
    map.addSource('nyc-data', {
        type: 'geojson',
        data: 'https://data.cityofnewyork.us/resource/rvih-nhyn.geojson'
    });

    map.addLayer({
        'id': 'nyc-data-layer',
        'type': 'circle',
        'source': 'nyc-data',
        'paint': {
            'circle-color': '#ff0000', // Adjust color as needed
            'circle-radius': 5
        }
    });
});