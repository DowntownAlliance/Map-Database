mapboxgl.accessToken = 'pk.eyJ1Ijoiem9lbGluMTEyMiIsImEiOiJjbDZlNzBpaWEwMHR3M2VzZTFtbjc0azlkIn0.8zDjJUVT6PoiR8tj6Re7bA';

var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/dark-v10', // Replace with your preferred Mapbox style
    center: [-74.01045300426145, 40.70999225084837], // Centered at ADNY coordinates
    zoom: 14.4
});

map.on('load', function () {
    map.addSource('nyc-pop', {
        type: 'geojson',
        data: 'https://data.cityofnewyork.us/resource/rvih-nhyn.geojson'
    });

    map.addLayer({
        'id': 'nyc-pop-points',
        'type': 'circle',
        'source': 'nyc-pop',
        'paint': {
            'circle-color': '#ff0000', // Adjust color as needed
            'circle-radius': 5
        }
    });

    map.addSource('nyc-parks', {
        type: 'geojson',
        data: 'https://data.cityofnewyork.us/resource/enfh-gkve.geojson'
    });

    map.addLayer({
        'id': 'nyc-parks-polygons',
        'type': 'fill',
        'source': 'nyc-parks',
        'paint': {
            'fill-color': '#008000', // Adjust color as needed
            'fill-opacity': 1
        }
    });

    // Add click event listener to the map
    map.on('click', function (e) {
        // Get the coordinates of the clicked point
        var lngLat = e.lngLat;

        // Print the coordinates to the console
        console.log('Longitude: ' + lngLat.lng + ', Latitude: ' + lngLat.lat);
    });
});

//https://data.cityofnewyork.us/resource/enfh-gkve.json