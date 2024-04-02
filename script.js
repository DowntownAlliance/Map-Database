mapboxgl.accessToken = 'pk.eyJ1Ijoiem9lbGluMTEyMiIsImEiOiJjbDZlNzBpaWEwMHR3M2VzZTFtbjc0azlkIn0.8zDjJUVT6PoiR8tj6Re7bA';

var nycBounds = [
    [-74.25909, 40.477399], // Southwest coordinates of NYC
    [-73.700181, 40.917577]  // Northeast coordinates of NYC
];

var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/zoelin1122/clgk7vp2i013j01ppuk7qmu2e', // Replace with your preferred Mapbox style
    center: [-74.01045300426145, 40.70999225084837], // Centered at ADNY coordinates
    zoom: 14.4,
    maxBounds: nycBounds
});

map.on('load', function () {
    map.addSource('nyc-pop', {
        type: 'geojson',
        data: 'https://data.cityofnewyork.us/resource/rvih-nhyn.geojson?$limit=1000'
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
        data: 'https://data.cityofnewyork.us/resource/enfh-gkve.geojson?$limit=10000'
    });

    map.addLayer({
        'id': 'nyc-parks-polygons',
        'type': 'fill',
        'source': 'nyc-parks',
        'paint': {
            'fill-color': '#93C572', // Adjust color as needed
            'fill-opacity': .8
        }
    });

    map.addSource('adny_only', {
        type: 'geojson',
        data: 'data/adny_only.geojson'
    });

    map.addLayer({
        'id': 'adny-mask',
        'type': 'line',
        'source': 'adny_only',
        'paint': {
            'line-color': '#FF0000', // Red color for the outline
            'line-width': 2 // Adjust the width of the outline as needed
        }
    });

    map.on('click', 'nyc-pop-points', function(e){
        let name = e.features[0].properties["building_address_with_zip"];
        let detail = e.features[0].properties["building_location"];
        let size = e.features[0].properties["size_required"];
        let hours = e.features[0].properties["hour_of_access_required"];

    
        new mapboxgl.Popup()
            .setLngLat(e.lngLat)
            .setHTML("<h1>"+ name + '</h1> <br>' + detail + '<br>' + size + '  |  ' + hours)
            .addTo(map);
    });

    map.on('click', 'nyc-parks-polygons', function(e){
        let name = e.features[0].properties["name311"];
        let detail = e.features[0].properties["address"];
        let size = e.features[0].properties["acres"];
        let sqf = size*43560

    
        new mapboxgl.Popup()
            .setLngLat(e.lngLat)
            .setHTML("<h1>"+ name + '</h1> <br>' + detail + '<br>' + sqf)
            .addTo(map);
    });

    // Add click event listener to the map
    map.on('click', function (e) {
        // Get the coordinates of the clicked point
        var lngLat = e.lngLat;

        // Print the coordinates to the console
        console.log('Longitude: ' + lngLat.lng + ', Latitude: ' + lngLat.lat);
    });
    

    // Query the mask layer to get its geometry
    map.querySourceFeatures('adny_only', { sourceLayer: 'adny_only' }, function (features) {
        if (features.length > 0) {
            var maskGeometry = features[0].geometry;
    
            console.log('Mask Geometry:', maskGeometry);
    
            // Filter points layer to keep only points within the mask polygon
            var filteredFeatures = map.querySourceFeatures('nyc-pop', {
                filter: ['within', maskGeometry]
            });
    
            console.log('Filtered Features:', filteredFeatures);
    
            // Update the data source with the filtered points
            map.getSource('nyc-pop').setData({
                type: 'FeatureCollection',
                features: filteredFeatures
            });
        } else {
            console.error('No features found in mask layer.');
        }

        // You can use the filteredFeatures for further processing or rendering
    });
});
