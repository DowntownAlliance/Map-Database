
mapboxgl.accessToken = 'pk.eyJ1Ijoiem9lbGluMTEyMiIsImEiOiJjbDZlNzBpaWEwMHR3M2VzZTFtbjc0azlkIn0.8zDjJUVT6PoiR8tj6Re7bA';

var nycBounds = [
    [-74.03008569208115, 40.68856158972661], // Southwest coordinates of NYC
    [-73.9908569208115, 40.72856158972661]  // Northeast coordinates of NYC
];

var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/zoelin1122/clgk7vp2i013j01ppuk7qmu2e', // Replace with your preferred Mapbox style
    center: [-74.01008569208115, 40.70756158972661], // Centered at ADNY coordinates
    zoom: 14.65,
    maxBounds: nycBounds
});


async function fetchCSVAndConvertToGeoJSON(csvUrl) {
    const response = await fetch(csvUrl);
    const csvData = await response.text();

    const geojsonFeatures = [];

    $.csv.toObjects(csvData, { headers: true })
        .forEach((row) => {
            // Convert each row into a GeoJSON feature
            const feature = {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [parseFloat(row['Longitude Point']), parseFloat(row['Latitude Point'])]
                },
                properties: {
                    // Populate properties as needed from CSV columns
                    JobNumber: row['Job Number'],
                    BoroughName: row['Borough Name'],
                    CountPermits: parseInt(row['Count Permits']),
                    FirstPermitDate: row['First Permit Date'],
                    CurrentDate: new Date(row['Current Date']),
                    Age: parseInt(row['Age']),
                    PermitExpirationDate: new Date(row['Permit Expiration Date']),
                    SidewalkShedLinearFeet: parseInt(row['Sidewalk Shed/Linear Feet']),
                    ConstructionMaterial: row['Construction Material'],
                    CurrentJobStatus: row['Current Job Status'],
                    BINNumber: parseInt(row['BIN Number']),
                    CommunityBoard: parseInt(row['Community Board']),
                    ApplicantBusinessName: row['Applicant Business Name'],
                    HouseNumber: row['House Number'],
                    StreetName: row['Street Name'],
                    Activity: row['activity'],
                    Commercial: row['Commercial'] === '1' // Convert to boolean
                }
            };

            geojsonFeatures.push(feature);
        });

    const geojson = {
        type: 'FeatureCollection',
        features: geojsonFeatures
    };

    // Function to add GeoJSON layer to the map
    function addGeoJSONLayerToMap(geojson) {
        map.addSource('active-sheds-data', {
            type: 'geojson',
            data: geojson
        });

        map.addLayer({
            id: 'nyc-active-sheds',
            type: 'circle',
            source: 'active-sheds-data',
            paint: {
                'circle-color': '#FFBF00', // Adjust color as needed
                'circle-radius': 6,
                "circle-stroke-width": 1,
                "circle-stroke-color": "#000",
            },
            'layout': {
                // Make the layer visible by default.
                'visibility': 'none'
            }
        });

        map.on('click', 'nyc-active-sheds', function(e){
            let name = e.features[0].properties["HouseNumber"];
            let name2 = e.features[0].properties["StreetName"];
            let detail = e.features[0].properties["SidewalkShedLinearFeet"];
            let date = new Date(e.features[0].properties["FirstPermitDate"]);
            let year = date.getFullYear();
            let month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based (0 = January)
            let day = String(date.getDate()).padStart(2, '0');
            let formattedDate = `${year}-${month}-${day}`;
            let age = e.features[0].properties["Age"];
            let lat = e.lngLat.lat.toFixed(14); // Extract latitude and round to 6 decimal places
            let lng = e.lngLat.lng.toFixed(14); // Extract longitude and round to 6 decimal places
        
            // Construct the road view URL with the extracted latitude and longitude
            let roadViewUrl = `https://roadview.planninglabs.nyc/view/${lng}/${lat}`;
        
            // Create the HTML content for the popup
            let popupContent = `
                DOB Scaffolding
                <h1>${name} ${name2}</h1>
                <br>
                ${detail} feet long
                <br>
                Issued ${formattedDate} | Been up ${age} days
                <br>
                <a href="${roadViewUrl}" target="_blank">See Road View</a>
            `;
        
            // Create a new popup and set its content
            new mapboxgl.Popup()
                .setLngLat(e.lngLat)
                .setHTML(popupContent)
                .addTo(map);
        });
    }


    addGeoJSONLayerToMap(geojson);
}

// Call the function to fetch CSV data and convert to GeoJSON
const csvUrl = 'https://nycdob.github.io/ActiveShedPermits/data/Active_Sheds2.csv';
fetchCSVAndConvertToGeoJSON(csvUrl);

map.on('load', function () {

    //ADNY Pedestrain Estimation BigBelly
    map.addSource('adny-ped', {
        type: 'geojson',
        data: 'data/pedestrian_estimate.geojson'
    });

    map.addLayer({
        'id': 'adny-pedestrain-estimation',
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


    map.on('mousemove', 'adny-pedestrain-estimation', function(e) {
        if (e.features.length > 0) {
            let number = Math.round(e.features[0].properties["Median Count"]);
            let formattedNumber = number.toLocaleString();
            document.getElementById('pedestrian-count').textContent = formattedNumber;
        } else {
            // If no features are found under the cursor, reset the content
            document.getElementById('pedestrian-count').textContent = '-';
        }
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
        },
        'layout': {
          // Make the layer visible by default.
          'visibility': 'none'
        }
    });

    map.on('click', 'nyc-parks-polygons', function(e){
        let name = e.features[0].properties["name311"];
        let detail = e.features[0].properties["address"];
        let size = e.features[0].properties["acres"];
        let sqf = size*43560

    
        new mapboxgl.Popup()
            .setLngLat(e.lngLat)
            .setHTML("NYC Parks Property <br> <h1>"+ name + '</h1> <br>' + detail + '<br>' + sqf)
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
        'id': 'adny-public-spaces',
        'type': 'circle',
        'source': 'adny-ps',
        'paint': {
            'circle-color': '#D2042D', // Adjust color as needed
            'circle-radius': 6,
            "circle-stroke-width": 1,
            "circle-stroke-color": "#000",
        }
    });

    map.on('click', 'adny-public-spaces', function(e){
        let name = e.features[0].properties["Name"];
        let detail = e.features[0].properties["Address"];
        let size = e.features[0].properties["Usable Area (sf)"];
        let hours = e.features[0].properties["Agency Oversight"];
        let lat = e.lngLat.lat.toFixed(14); // Extract latitude and round to 6 decimal places
        let lng = e.lngLat.lng.toFixed(14); // Extract longitude and round to 6 decimal places
    
        // Construct the road view URL with the extracted latitude and longitude
        let roadViewUrl = `https://roadview.planninglabs.nyc/view/${lng}/${lat}`;
    
        // Create the HTML content for the popup
        let popupContent = `
            ADNY Identified Public Space
            <h1>${name}</h1>
            <br>
            ${detail}
            <br>
            ${size} sqf | ${hours}
            <br>
            <a href="${roadViewUrl}" target="_blank">See Road View</a>
        `;
    
        // Create a new popup and set its content
        new mapboxgl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(popupContent)
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
            'circle-color': '#0000FF', // Adjust color as needed
            'circle-radius': 6,
            "circle-stroke-width": 1,
            "circle-stroke-color": "#000"
        },
        'filter': ['all',
        ['==', 'borocode', '1'],
        ['in', 'zip_code', '10007', '10038', '10004', '10006', '10005', '10038']
        ],
        'layout': {
          // Make the layer visible by default.
          'visibility': 'none'
          }
    });

    map.on('click', 'nyc-pop-points', function(e){
        let name = e.features[0].properties["building_address_with_zip"];
        let detail = e.features[0].properties["building_location"];
        let size = e.features[0].properties["size_required"];
        let hours = e.features[0].properties["hour_of_access_required"];
        let lat = e.lngLat.lat.toFixed(14); // Extract latitude and round to 6 decimal places
        let lng = e.lngLat.lng.toFixed(14); // Extract longitude and round to 6 decimal places
    
        // Construct the road view URL with the extracted latitude and longitude
        let roadViewUrl = `https://roadview.planninglabs.nyc/view/${lng}/${lat}`;
    
        // Create the HTML content for the popup
        let popupContent = `
            DCP's list of POPs
            <h1>${name}</h1>
            <br>
            ${detail}
            <br>
            ${size} sqf | ${hours}
            <br>
            <a href="${roadViewUrl}" target="_blank">See Road View</a>
        `;
    
        // Create a new popup and set its content
        new mapboxgl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(popupContent)
            .addTo(map);
    });

    //NYC DATA ON LANDMARKS
    //https://data.cityofnewyork.us/resource/buis-pvji.geojson
    map.addSource('nyc-od-landmarks', {
        type: 'geojson',
        data: 'https://data.cityofnewyork.us/resource/buis-pvji.geojson?$limit=2000'
    });

    map.addLayer({
        'id': 'nyc-landmarks',
        'type': 'fill',
        'source': 'nyc-od-landmarks',
        'paint': {
            'fill-color':'#0000FF',
            'fill-opacity':0.1,
        },
        'layout': {
            // Make the layer visible by default.
            'visibility': 'none'
        }
    });

    map.on('click', 'nyc-landmarks', function(e){
        let name = e.features[0].properties["lpc_name"];
        let detail = e.features[0].properties["address"];
        let alt = e.features[0].properties["lpc_altern"];
        let url = e.features[0].properties["url_report"];
        let lat = e.lngLat.lat.toFixed(14); // Extract latitude and round to 6 decimal places
        let lng = e.lngLat.lng.toFixed(14); // Extract longitude and round to 6 decimal places
    
        // Construct the road view URL with the extracted latitude and longitude
        let roadViewUrl = `https://roadview.planninglabs.nyc/view/${lng}/${lat}`;
    
        // Create the HTML content for the popup
        let popupContent = `
            LPC's Designated Landmarks
            <h1>${name}</h1>
            <br>
            ${detail}
            <br>
            ${alt !== undefined ? alt + '<br>' : ''}
            <a href="${url}" target="_blank">See Report of Designation</a>
            <br>
            <a href="${roadViewUrl}" target="_blank">See Road View</a>
        `;
    
        // Create a new popup and set its content
        new mapboxgl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(popupContent)
            .addTo(map);
    });



    // ADNY BOUNDARY
    // map.addSource('adny_only', {
    //     type: 'geojson',
    //     data: 'https://data.cityofnewyork.us/resource/7jdm-inj8.geojson?bid=Downtown%20Alliance%20BID'
    // });

    // map.addLayer({
    //     'id': 'adny-boundary',
    //     'type': 'line',
    //     'source': 'adny_only',
    //     'paint': {
    //         'line-color': '#FF0000', // Red color for the outline
    //         'line-width': 2 // Adjust the width of the outline as needed
    //     }
    // });

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

    map.addLayer({
        'id': 'adny-boundary',
        'type': 'line',
        'source': 'adny_mask',
        'paint': {
            'line-color': '#FF0000', // Red color for the outline
            'line-width': 2 // Adjust the width of the outline as needed
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
            'line-color': '#AAFF00', 
            'line-width': 10,
            'line-opacity': .7
        }
    });

    //ADNY EXTEROS LOCATIONS
    map.addSource('exteros-points', {
        type: 'geojson',
        data: 'data/exteros.geojson'
    });

    map.addLayer({
        'id': 'exteros-locations',
        'type': 'circle',
        'source': 'exteros-points',
        'paint': {
            'circle-color': '#DFFF00', // Adjust color as needed
            'circle-radius': 4,
            "circle-stroke-width": 1,
            "circle-stroke-color": "#000"
        },
        'layout': {
          // Make the layer visible by default.
          'visibility': 'none'
        }
    });

    // // Query the mask layer to get its geometry
    // map.querySourceFeatures('adny_mask', { sourceLayer: 'adny_mask' }, function (features) {
    //     console.log(features)
    //     if (features.length > 0) {
    //         var maskGeometry = features[0].geometry;
    //         console.log(maskGeometry)
    //         // Filter subway lines layer
    //         var subwayFilter = ['intersects', ['geometry'], maskGeometry];
    //         map.setFilter('nyc-train-lines', subwayFilter);

    //         // Filter pop points layer
    //         var popFilter = ['intersects', ['geometry'], maskGeometry];
    //         map.setFilter('nyc-pop-points', popFilter);

    //         // Filter parks layer
    //         var parksFilter = ['intersects', ['geometry'], maskGeometry];
    //         map.setFilter('nyc-parks-polygons', parksFilter);

    //         // Filter openstreet lines layer
    //         var openstreetFilter = ['intersects', ['geometry'], maskGeometry];
    //         map.setFilter('nyc-openstreet-lines', openstreetFilter);

    //         // Now the layers will only display features that intersect with the LARGE ADNY BOUNDARY
    //     } else {
    //         console.error('No features found in mask layer.');
    //     }
    // });
    var style = map.getStyle();

    // Extract layer IDs from the style object
    var layerIds = style.layers.map(layer => layer.id);

    // Log the list of layer IDs to the console
    console.log('Layer IDs:', layerIds);

});


//FUNCTIONS
// Function to transform layer ID
function transformLayerId(id) {
    // Replace hyphens with spaces
    let transformedId = id.replace(/-/g, ' ');
    
    // Title case the text
    transformedId = transformedId.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    
    // Replace 'nyc' with 'NYC' and 'adny' with 'ADNY'
    transformedId = transformedId.replace(/\bNyc\b/g, 'NYC').replace(/\bAdny\b/g, 'ADNY').replace(/\Pop\b/g, 'POP');
    return transformedId;
}

// Add click event listener to the map
map.on('click', function (e) {
    var lngLat = e.lngLat;
    var zoom = map.getZoom(); // Get the current zoom level

    // Print the coordinates to the console
    console.log('Longitude: ' + lngLat.lng + ', Latitude: ' + lngLat.lat+ ', Zoom: ' + zoom);
});

// After the last frame rendered before the map enters an "idle" state.
map.on('idle', () => {
  // If these two layers were not added to the map, abort 
  if (!map.getLayer('adny-pedestrain-estimation') || !map.getLayer('nyc-parks-polygons')|| !map.getLayer('nyc-train-lines')|| !map.getLayer('nyc-pop-points')|| !map.getLayer('adny-public-spaces')|| !map.getLayer('nyc-openstreet-lines')|| !map.getLayer('exteros-locations')) {
  return;
  }
   
  // Enumerate ids of the layers.
  const toggleableLayerIds = [
        "adny-public-spaces",
        "adny-pedestrain-estimation",
        "nyc-pop-points",
        "nyc-parks-polygons",
        "nyc-openstreet-lines",
        "nyc-train-lines",
        "nyc-landmarks",
        "nyc-active-sheds",
        "exteros-locations"
    ];
   
  // Set up the corresponding toggle button for each layer.
  for (const id of toggleableLayerIds) {
    // Skip layers that already have a button set up.
    if (document.getElementById(id)) {
        continue;
    }
    
    // Create a link.
    const link = document.createElement('a');
    link.className = 'toggle'
    link.id = id;
    link.href = '#';
    link.textContent = transformLayerId(id);
    if ((link.id != 'nyc-parks-polygons')&&(link.id != 'nyc-pop-points')&&(link.id != 'nyc-landmarks')&&(link.id !='nyc-active-sheds')&&(link.id !='exteros-locations')){
        link.className = 'activeToggle';
    };


    
    // Show or hide layer when the toggle is clicked.
    link.onclick = function (e) {
        const clickedLayer = this.id;
        e.preventDefault();
        e.stopPropagation();
        
        const visibility = map.getLayoutProperty(
            clickedLayer,
            'visibility'
        );
        
        // Toggle layer visibility by changing the layout object's visibility property.
        if (visibility === 'visible') {
            map.setLayoutProperty(clickedLayer, 'visibility', 'none');
            this.className = 'toggle';
            // this.parentElement.className = 'toggle';
        } else {
            this.className = 'activeToggle';
            // this.parentElement.className = 'activeButton';
            map.setLayoutProperty(
                clickedLayer,
                'visibility',
                'visible'
            );
        }
    };  
    
    const menus = document.getElementById('menu');
    // toggle.appendChild(link)
    menus.appendChild(link);
    }
});

// Add the control to the map.
map.addControl(
    new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl: mapboxgl,
        placeholder: 'Search for a location...',
        proximity: "-74.01008569208115, 40.70756158972661"
    })
);
