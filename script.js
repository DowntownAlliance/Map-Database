mapboxgl.accessToken = 'pk.eyJ1Ijoiem9lbGluMTEyMiIsImEiOiJjbDZlNzBpaWEwMHR3M2VzZTFtbjc0azlkIn0.8zDjJUVT6PoiR8tj6Re7bA';

var nycBounds = [
    [-74.03, 40.699], // Southwest coordinates of NYC
    [-73.9979, 40.7173]  // Northeast coordinates of NYC
];

var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/zoelin1122/clgk7vp2i013j01ppuk7qmu2e', // Replace with your preferred Mapbox style
    center: [-74.01062599304956, 40.70848542095962], // Centered at ADNY coordinates
    zoom: 14.4,
    maxBounds: nycBounds
});


map.on('load', function () {

    //ADNY Pedestrain Estimation BigBelly
    map.addSource('adny-ped', {
        type: 'geojson',
        data: 'data/pedestrian_estimate.geojson'
    });

    map.addLayer({
        'id': 'adny-ped-poly',
        'type': 'fill',
        'source': 'adny-ped',
        'paint': {
            'fill-color': [
                'interpolate',
                ['linear'],
                ['get', 'Median Count'],
                0, 'rgb(173,216,230)',  // Light blue (for low values)
                150000, 'rgb(178,34,34)'  // Dark red (for high values)
            ],
            'fill-opacity': 0.2  // Adjust the opacity as needed
        }
    });

    map.on('click', 'adny-ped-poly', function(e){
        let number = Math.round(e.features[0].properties["Median Count"]);
    
        new mapboxgl.Popup()
            .setLngLat(e.lngLat)
            .setHTML("Estimated Pedestrian: " + number + " people pass through a day" )
            .addTo(map);
    });

    //NYC DATA ON PARKS
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

    //NYC DATA ON transit
    map.addSource('nyc-train', {
        type: 'geojson',
        data: 'https://data.cityofnewyork.us/resource/s7zz-qmyz.geojson'
    });

    map.addLayer({
        'id': 'nyc-train-lines',
        'type': 'line',
        'source': 'nyc-train',
        'paint': {
            'line-color': [
                'match',
                ['get', 'rt_symbol'], // Use the subway line identifier from the data
                "1", "#EE352E",
                "2", "#EE352E",
                "3", "#EE352E",
                "4", "#00933C",
                "5", "#00933C",
                "6", "#00933C",
                "7", "#B933AD",
                "A", "#0039A6",
                "C", "#0039A6",
                "E", "#0039A6",
                "B", "#FF6319",
                "D", "#FF6319",
                "F", "#FF6319",
                "M", "#FF6319",
                "G", "#6CBE45",
                "J", "#996633",
                "Z", "#996633",
                "L", "#A7A9AC",
                "N", "#FCCC0A",
                "Q", "#FCCC0A",
                "R", "#FCCC0A",
                "S", "#808183",
                "W", "#FCCC0A",
                "GS", "#808183",
                "FS", "#808183",
                "H", "#808183",
                '#ff0000' // Default color if line not found in subwayLineColors
            ],
            'line-width': 2,
            'line-opacity': .8
        }
    });


    //ADNY Public Spaces Database
    map.addSource('adny-ps', {
        type: 'geojson',
        data: 'data/public_space_pedestrian_estimate.geojson'
    });

    map.addLayer({
        'id': 'adny-ps-points',
        'type': 'circle',
        'source': 'adny-ps',
        'paint': {
            'circle-color': '#39ff14', // Adjust color as needed
            'circle-radius': 5
        }
    });

    map.on('click', 'adny-ps-points', function(e){
        let name = e.features[0].properties["Name"];
        let detail = e.features[0].properties["Address"];
        let size = e.features[0].properties["Usable Area (sf)"];
        let hours = e.features[0].properties["Agency Oversight"];

    
        new mapboxgl.Popup()
            .setLngLat(e.lngLat)
            .setHTML("<h1>"+ name + '</h1> <br>' + detail + '<br>' + size + 'sqf  |  ' + hours)
            .addTo(map);
    });

    //NYC DATA ON POPS
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
        },
        'filter': ['all',
        ['==', 'borocode', '1'],
        ['in', 'zip_code', '10007', '10038', '10004', '10006', '10005', '10038']
        ]
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



    // ADNY BOUNDARY
    map.addSource('adny_only', {
        type: 'geojson',
        data: 'https://data.cityofnewyork.us/resource/7jdm-inj8.geojson?bid=Downtown%20Alliance%20BID'
    });

    map.addLayer({
        'id': 'adny-boundary',
        'type': 'line',
        'source': 'adny_only',
        'paint': {
            'line-color': '#FF0000', // Red color for the outline
            'line-width': 2 // Adjust the width of the outline as needed
        }
    });

    map.addSource('adny_mask', {
        type: 'geojson',
        data: 'data/mask.geojson'
    });

    map.addLayer({
        'id': 'adny-mask',
        'type': 'fill',
        'source': 'adny_mask',
        'paint': {
            'fill-color':'#000000',
            'fill-opacity': 0.3
        }
    });

    //NYC DATA ON OPENSTREETS
    map.addSource('nyc-openstreet', {
        type: 'geojson',
        data: 'https://data.cityofnewyork.us/resource/uiay-nctu.geojson?$limit=1000'
    });

    map.addLayer({
        'id': 'nyc-openstreet-lines',
        'type': 'line',
        'source': 'nyc-openstreet',
        'paint': {
            'line-color': '#FF0000', 
            'line-width': 10,
            'line-opacity': .5
        }
    });

    // Query the mask layer to get its geometry
    map.querySourceFeatures('adny_mask', { sourceLayer: 'adny_mask' }, function (features) {
        console.log(features)
        if (features.length > 0) {
            var maskGeometry = features[0].geometry;
            console.log(maskGeometry)
            // Filter subway lines layer
            var subwayFilter = ['intersects', ['geometry'], maskGeometry];
            map.setFilter('nyc-train-lines', subwayFilter);

            // Filter pop points layer
            var popFilter = ['intersects', ['geometry'], maskGeometry];
            map.setFilter('nyc-pop-points', popFilter);

            // Filter parks layer
            var parksFilter = ['intersects', ['geometry'], maskGeometry];
            map.setFilter('nyc-parks-polygons', parksFilter);

            // Filter openstreet lines layer
            var openstreetFilter = ['intersects', ['geometry'], maskGeometry];
            map.setFilter('nyc-openstreet-lines', openstreetFilter);

            // Now the layers will only display features that intersect with the LARGE ADNY BOUNDARY
        } else {
            console.error('No features found in mask layer.');
        }
    });

});

//FUNCTIONS
// Add click event listener to the map
map.on('click', function (e) {
    // Get the coordinates of the clicked point
    var lngLat = e.lngLat;

    // Print the coordinates to the console
    console.log('Longitude: ' + lngLat.lng + ', Latitude: ' + lngLat.lat);
});

