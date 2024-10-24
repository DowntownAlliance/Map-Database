function toTitleCase(str) {
    return str.replace(
      /\w\S*/g,
      text => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
    );
}

function getFormattedDate() {
    const today = new Date();
    
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are zero-based
    const day = String(today.getDate()).padStart(2, '0');

    // Construct the date string in the required format
    const formattedDate = `${year}-${month}-${day}T00:00:00.000`;
    
    return formattedDate;
}

const datasets = [
    {
        name: 'NYC POPS',
        endpoint: 'https://data.cityofnewyork.us/resource/rvih-nhyn.geojson?$limit=1000&$where=zip_code%20in%20(%2710007%27,%20%2710038%27,%20%2710004%27,%20%2710006%27,%20%2710005%27)',
        fileType: 'geojson'
    },
    {
        name: 'NYC Landmarks',
        endpoint: 'https://data.cityofnewyork.us/resource/buis-pvji.geojson?$limit=2000&$where=block%20>%20130%20AND%20borough=%27MN%27',
        fileType: 'geojson'
    },
    {
        name: 'NYC Parks',
        endpoint: 'https://data.cityofnewyork.us/resource/enfh-gkve.geojson?$limit=10000&councildistrict=1',
        fileType: 'geojson'
    },
    {
        name: 'NYC OpenStreet',
        endpoint: 'https://data.cityofnewyork.us/resource/uiay-nctu.geojson?$limit=1000',
        fileType: 'geojson'
    },
    {
        name: 'DOB_Active Shed Permits',
        endpoint: 'https://nycdob.github.io/ActiveShedPermits/data/Active_Sheds2.csv',
        fileType: 'csv'
    },  
    {
        name: 'NYC Aerial',
        endpoint: 'https://maps.nyc.gov/xyz/1.0.0/photo/2018/{z}/{x}/{y}.png8',
        fileType: 'raster'
    },  
];


document.addEventListener('DOMContentLoaded', function() {
    // // Define the two map styles
    // const style1 = 'mapbox://styles/mapbox/satellite-v9';
    // const style2 = 'mapbox://styles/zoelin1122/clgk7vp2i013j01ppuk7qmu2e';

    // // Function to toggle between map styles
    // function toggleMapStyle() {
    //     const currentStyle = map.getStyle().sources.mapbox;
    //     const newStyle = currentStyle === style1 ? style2 : style1;
        
    //     // Set the new map style
    //     map.setStyle(newStyle);
    // }

    // // Add a button or control to trigger the map style toggle
    // const toggleButton = document.getElementById('toggleButton'); // Replace 'toggleButton' with your button's ID

    // toggleButton.addEventListener('click', toggleMapStyle);

    mapboxgl.accessToken = 'pk.eyJ1IjoiZG93bnRvd25hbGxpYW5jZSIsImEiOiJjbHV2YXVpcHIwMWtuMmpwYjk0NGNxcnh3In0.rYzWfkrrO07yLStZqJss_A';

    var nycBounds = [
        [-74.03008569208115, 40.68856158972661], // Southwest coordinates of NYC
        [-73.9908569208115, 40.72856158972661]  // Northeast coordinates of NYC
    ];

    var map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/zoelin1122/clgk7vp2i013j01ppuk7qmu2e', // Replace with your preferred Mapbox style
        // style: style2,
        center: [-74.01178569208115, 40.70756158972661], // Centered at ADNY coordinates
        zoom: 14.5,
        maxBounds: nycBounds,
        preserveDrawingBuffer: true
    });


    async function fetchCSVAndConvertToGeoJSON(csvUrl, options) {
        const response = await fetch(csvUrl);
        const csvData = await response.text();

        const geojsonFeatures = [];

        $.csv.toObjects(csvData, { headers: true })
            .forEach((row) => {
                // console.log(row)
                if ('Borough Digit' in row && 'Block' in row) {
                    const boroughDigit = parseInt(row['Borough Digit']);
                    const block = parseInt(row['Block']);
        
                    // Filter rows based on conditions (if columns exist)
                    if (boroughDigit === 1 && block <= 130) {
                        // Convert each row into a GeoJSON feature
                        const feature = {
                            type: 'Feature',
                            geometry: {
                                type: 'Point',
                                coordinates: [parseFloat(row[options.longitudeField]), parseFloat(row[options.latitudeField])]
                            },
                            properties: {}
                        }; // Map CSV columns to GeoJSON properties
                        Object.keys(options.propertyMap).forEach((csvColumn) => {
                            const geojsonProperty = options.propertyMap[csvColumn];
                            let value = row[csvColumn];
    
                            // Perform type conversion if specified
                            if (typeof geojsonProperty.type === 'number') {
                                value = parseFloat(value);
                            } else if (geojsonProperty.type === 'boolean') {
                                value = value === '1'; // Convert to boolean
                            } else if (geojsonProperty.type === 'date') {
                                value = new Date(value); // Convert to Date object
                            }
    
                            feature.properties[geojsonProperty.name] = value;
                        });
    
                        geojsonFeatures.push(feature);
                    }

                } else {
                    // Convert each row into a GeoJSON feature
                    const feature = {
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: [parseFloat(row[options.longitudeField]), parseFloat(row[options.latitudeField])]
                        },
                        properties: {}
                    };

                    // Map CSV columns to GeoJSON properties
                    Object.keys(options.propertyMap).forEach((csvColumn) => {
                        const geojsonProperty = options.propertyMap[csvColumn];
                        let value = row[csvColumn];

                        // Perform type conversion if specified
                        if (typeof geojsonProperty.type === 'number') {
                            value = parseFloat(value);
                        } else if (geojsonProperty.type === 'boolean') {
                            value = value === '1'; // Convert to boolean
                        } else if (geojsonProperty.type === 'date') {
                            value = new Date(value); // Convert to Date object
                        }

                        feature.properties[geojsonProperty.name] = value;
                    });

                    geojsonFeatures.push(feature);
                }     
            });

        const geojson = {
            type: 'FeatureCollection',
            features: geojsonFeatures
        };

        // Add GeoJSON layer to the map
        function addGeoJSONLayerToMap(geojson, layerOptions) {
            map.addSource(layerOptions.sourceId, {
                type: 'geojson',
                data: geojson
            });

            map.addLayer({
                id: layerOptions.layerId,
                type: layerOptions.layerType,
                source: layerOptions.sourceId,
                paint: layerOptions.paint,
                layout: {
                    visibility: layerOptions.visibility // Hide layer by default
                }
            });

            if (layerOptions.onClick) {
                map.on('click', layerOptions.layerId, layerOptions.onClick);
            }
        }

        // Add GeoJSON layer to the map using provided options
        addGeoJSONLayerToMap(geojson, options.layerOptions);
        return geojson; // Return the GeoJSON data if needed

    }

    // Call the function to fetch CSV data and convert to GeoJSON
    const sheds = 'https://nycdob.github.io/ActiveShedPermits/data/Active_Sheds2.csv';
    const publicSpaces = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSg6HfyloZiH9VxTjBchen0mDYhtv3hvlqLNNLXzmO5DaVM8NJHN3_ODcBlJ4PawKltLSxodDDT0iwk/pub?gid=0&single=true&output=csv';
    const events = 'data/placemaking_events.csv';
    const art = 'data/public_art.csv';

    // Define options for CSV to GeoJSON conversion
    const shedsConversion = {
        longitudeField: 'Longitude Point',
        latitudeField: 'Latitude Point',
        propertyMap: {
            'Job Number': { name: 'JobNumber', type: 'string' },
            'Borough Name': { name: 'BoroughName', type: 'string' },
            'Count Permits': { name: 'CountPermits', type: 'number' },
            'First Permit Date': { name: 'FirstPermitDate', type: 'date' },
            'Current Date': { name: 'CurrentDate', type: 'date' },
            'Age': { name: 'Age', type: 'number' },
            'Permit Expiration Date': { name: 'PermitExpirationDate', type: 'date' },
            'Sidewalk Shed/Linear Feet': { name: 'SidewalkShedLinearFeet', type: 'number' },
            'Construction Material': { name: 'ConstructionMaterial', type: 'string' },
            'Current Job Status': { name: 'CurrentJobStatus', type: 'string' },
            'Borough Digit': { name: 'BoroughDigit', type: 'number' },
            'Block': { name: 'Block', type: 'number' },
            'Applicant Business Name': { name: 'ApplicantBusinessName', type: 'string' },
            'House Number': { name: 'HouseNumber', type: 'string' },
            'Street Name': { name: 'StreetName', type: 'string' },
            'activity': { name: 'Activity', type: 'string' },
            'Commercial': { name: 'Commercial', type: 'boolean' }
        },
        layerOptions: {
            sourceId: 'active-sheds-data',
            layerId: 'nyc-active-sheds',
            layerType: 'circle',
            paint: {
                'circle-color': '#FFBF00', // Adjust color as needed
                'circle-radius': 6,
                'circle-stroke-width': 1,
                'circle-stroke-color': '#000'
            },
            visibility: "none",
            onClick: function(e){
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
            }
        }
    };
    const publicConversion = {
        //Electricity on site	# of outlets + voltage	Lighting	Under Construction	ADNY Installation (Name, date)	Existing Public Art Name	Artist	Water Street Rezoning (Y/N)	Property Owner	Building Manager Name	Salesforce: Tenant/Location Created	Record Type	Primary Category	Title	Contact Information	Contact/Title (2)	Contact Information (2)	Notes	match	geometry
        longitudeField: 'lng',
        latitudeField: 'lat',
        propertyMap: {
            'Space Number (for Google Form)': { name: 'spaceNumber', type: 'number' },
            'Name': { name: 'name', type: 'string' },
            'Address': { name: 'address', type: 'string' },
            'Agency Oversight': { name: 'agencyOversight', type: 'string' },
            'Space Type': { name: 'spaceType', type: 'string' },
            'Pavement Type': { name: 'pavementType', type: 'string' },
            'Permanment amentities': { name: 'permanmentAmentities', type: 'string' },
            'Accesiblity': { name: 'accesiblity', type: 'string' },
            'Temporary amentities': { name: 'temporaryAmentities', type: 'string' },
            'Square Footage for Plaza': { name: 'squareFootagePlaza', type: 'string' },
            'Total Area (sf)': { name: 'totalArea', type: 'number' },
            'Usable Area (sf)': { name: 'usableArea', type: 'number' },
            'Site Plan LINK': { name: 'linkPlan', type: 'string' },
            'Photos LINK': { name: 'linkPhotos', type: 'string' },
            'Electricity on site': { name: 'electricityOnSite', type: 'string' },
            '# of outlets + voltage': { name: 'outletsVoltage', type: 'string' },
            'Lighting': { name: 'lighting', type: 'string' },
            'Under Construction': { name: 'underConstruction', type: 'string' },
            'ADNY Installation (Name, date)': { name: 'adnyInstallation', type: 'string' },
            'Existing Public Art Name': { name: 'existingPublicArtName', type: 'string' },
            'Artist': { name: 'artist', type: 'string' },
            'Water Street Rezoning (Y/N)': { name: 'waterStreetRezoning', type: 'string' },
            'Property Owner': { name: 'propertyOwner', type: 'string' },
            'Building Manager Name': { name: 'buildingManagerName', type: 'string' }
        },
        layerOptions: {
            sourceId: 'adny-ps-csv',
            layerId: 'adny-public-spaces',
            layerType: 'circle',
            paint: {
                'circle-color': '#D2042D', // Adjust color as needed
                'circle-radius': 6,
                'circle-stroke-width': 1,
                'circle-stroke-color': '#000'
            },
            visibility: "visible",
            onClick: function(e) {
                let name = e.features[0].properties["name"];
                let detail = e.features[0].properties["address"];
                let size = e.features[0].properties["usableArea"];
                let hours = e.features[0].properties["agencyOversight"];
                let linkPlan = e.features[0].properties["linkPlan"];
                let linkPhotos = e.features[0].properties["linkPhotos"];
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
                    <a href="${linkPlan}" target="_blank">See Site Plan</a> | <a href="${linkPhotos}" target="_blank">See Site Photos</a>
                    <br>
                    <a href="${roadViewUrl}" target="_blank">See Road View</a>
                `;
            
                // Create a new popup and set its content
                new mapboxgl.Popup()
                    .setLngLat(e.lngLat)
                    .setHTML(popupContent)
                    .addTo(map);
            }
        }
    };
    const eventsConversion = {
        //Electricity on site	# of outlets + voltage	Lighting	Under Construction	ADNY Installation (Name, date)	Existing Public Art Name	Artist	Water Street Rezoning (Y/N)	Property Owner	Building Manager Name	Salesforce: Tenant/Location Created	Record Type	Primary Category	Title	Contact Information	Contact/Title (2)	Contact Information (2)	Notes	match	geometry
        longitudeField: 'Building: Geolocation Fields (Longitude)',
        latitudeField: 'Building: Geolocation Fields (Latitude)',
        propertyMap: {
            'Placemaking: Placemaking Program': { name: 'program', type: 'string' },
            'Building: Building Street': { name: 'address', type: 'string' },
            'Description': { name: 'description', type: 'string' },
            'End date': { name: 'endDate', type: 'date' },
            'Start date': { name: 'startDate', type: 'date' },
            'Placemaking Event': { name: 'placemakingEvent', type: 'string' },
            'Partner Organization': { name: 'partnerOrganization', type: 'string' }
        },
        layerOptions: {
            sourceId: 'adny-events-csv',
            layerId: 'adny-events',
            layerType: 'circle',
            paint: {
                'circle-color': '#fc59a3', 
                'circle-radius': 6,
                'circle-stroke-width': 1,
                'circle-stroke-color': '#000'
            },
            visibility: "none",
            onClick: function(e) {
                let name = e.features[0].properties["placemakingEvent"];
                let detail = e.features[0].properties["address"];
                let size = e.features[0].properties["partnerOrganization"];

                let startDate = new Date(e.features[0].properties["startDate"]);
                let endDate = new Date(e.features[0].properties["endDate"]);
                let lat = e.lngLat.lat.toFixed(14); // Extract latitude and round to 6 decimal places
                let lng = e.lngLat.lng.toFixed(14); // Extract longitude and round to 6 decimal places
                let startyear = startDate.getFullYear();
                let startmonth = String(startDate.getMonth() + 1).padStart(2, '0'); // Months are zero-based (0 = January)
                let startday = String(startDate.getDate()).padStart(2, '0');
                let endyear = endDate.getFullYear();
                let endmonth = String(endDate.getMonth() + 1).padStart(2, '0'); // Months are zero-based (0 = January)
                let endday = String(endDate.getDate()).padStart(2, '0');
                let formattedStartDate = `${startyear}-${startmonth}-${startday}`;
                let formattedEndDate = `${endyear}-${endmonth}-${endday}`;
            
                // Construct the road view URL with the extracted latitude and longitude
                let roadViewUrl = `https://roadview.planninglabs.nyc/view/${lng}/${lat}`;
            
                // Create the HTML content for the popup
                let popupContent = `
                    ADNY Placemaking Events
                    <h1>${name}</h1>
                    <h2>${size}</h2>
                    ${detail}
                    <br>
                    from ${formattedStartDate} to ${formattedEndDate}
                    <br>
                    <a href="${roadViewUrl}" target="_blank">See Road View</a>
                `;
            
                // Create a new popup and set its content
                new mapboxgl.Popup()
                    .setLngLat(e.lngLat)
                    .setHTML(popupContent)
                    .addTo(map);
            }
        }
    };
    const artConversion = {
        //Electricity on site	# of outlets + voltage	Lighting	Under Construction	ADNY Installation (Name, date)	Existing Public Art Name	Artist	Water Street Rezoning (Y/N)	Property Owner	Building Manager Name	Salesforce: Tenant/Location Created	Record Type	Primary Category	Title	Contact Information	Contact/Title (2)	Contact Information (2)	Notes	match	geometry
        longitudeField: 'Building: Geolocation Fields (Longitude)',
        latitudeField: 'Building: Geolocation Fields (Latitude)',
        propertyMap: {
            'Account: Publication Name': { name: 'program', type: 'string' },
            'Account: Billing Address': { name: 'address', type: 'string' },
        },
        layerOptions: {
            sourceId: 'adny-art-csv',
            layerId: 'adny-art',
            layerType: 'circle',
            paint: {
                'circle-color': '#b433f9', 
                'circle-radius': 6,
                'circle-stroke-width': 1,
                'circle-stroke-color': '#000'
            },
            visibility: "none",
            onClick: function(e) {
                let name = e.features[0].properties["program"];
                let detail = e.features[0].properties["address"];

                let lat = e.lngLat.lat.toFixed(14); // Extract latitude and round to 6 decimal places
                let lng = e.lngLat.lng.toFixed(14); // Extract longitude and round to 6 decimal places
                
                // Construct the road view URL with the extracted latitude and longitude
                let roadViewUrl = `https://roadview.planninglabs.nyc/view/${lng}/${lat}`;
            
                // Create the HTML content for the popup
                let popupContent = `
                    ADNY Identified Public Art
                    <h1>${name}</h1>
                    <br>
                    ${detail}
                    <br>
                    <a href="${roadViewUrl}" target="_blank">See Road View</a>
                `;
            
                // Create a new popup and set its content
                new mapboxgl.Popup()
                    .setLngLat(e.lngLat)
                    .setHTML(popupContent)
                    .addTo(map);
            }
        }
    };

    // Function to attach or detach the mousemove event listener based on layer visibility
    function toggleMouseMoveListener(visible) {
        let estimationInfoElement = document.getElementById('estimation-info');
        if (visible) {
            estimationInfoElement.style.display = 'flex';
        } else {
            estimationInfoElement.style.display = 'none';
        }
    }

    map.on('load', function () {
        // NYC Aerial
        map.addSource('nyc-aerial-2018', {
            type: 'raster',
            tiles: [
                'https://maps.nyc.gov/xyz/1.0.0/photo/2018/{z}/{x}/{y}.png8'
            ],
            tileSize: 256,
            minzoom: 8,
            maxzoom: 19
        });
    
        map.addLayer({
            id: 'nyc-aerial',
            type: 'raster',
            source: 'nyc-aerial-2018',
            paint: {
                'raster-opacity': 1 
            },
            'layout': {
                // Make the layer visible by default.
                'visibility': 'none'
            }
        });

        //ADNY Pedestrian Estimation BigBelly
        map.addSource('adny-ped', {
            type: 'geojson',
            data: 'data/pedestrian_estimate.geojson'
        });

        map.addLayer({
            'id': 'adny-pedestrian-estimation',
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


        map.on('mousemove', 'adny-pedestrian-estimation', function(e) {
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
            data: 'https://data.cityofnewyork.us/resource/enfh-gkve.geojson?$limit=10000&councildistrict=1'
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


        // //ADNY Public Spaces Database
        fetchCSVAndConvertToGeoJSON(publicSpaces, publicConversion);
        // //ADNY event
        fetchCSVAndConvertToGeoJSON(events, eventsConversion);
        // //ADNY art
        fetchCSVAndConvertToGeoJSON(art, artConversion);
        //DOB SHED DATA
        fetchCSVAndConvertToGeoJSON(sheds, shedsConversion);

        // map.addSource('adny-ps', {
        //     type: 'geojson',
        //     data: 'data/public_space_pedestrian_estimate.geojson'
        // });

        // map.addLayer({
        //     'id': 'adny-public-spaces',
        //     'type': 'circle',
        //     'source': 'adny-ps',
        //     'paint': {
        //         'circle-color': '#D2042D', // Adjust color as needed
        //         'circle-radius': 6,
        //         "circle-stroke-width": 1,
        //         "circle-stroke-color": "#000",
        //     }
        // });

        // map.on('click', 'adny-public-spaces', function(e){
        //     let name = e.features[0].properties["Name"];
        //     let detail = e.features[0].properties["Address"];
        //     let size = e.features[0].properties["Usable Area (sf)"];
        //     let hours = e.features[0].properties["Agency Oversight"];
        //     let lat = e.lngLat.lat.toFixed(14); // Extract latitude and round to 6 decimal places
        //     let lng = e.lngLat.lng.toFixed(14); // Extract longitude and round to 6 decimal places
        
        //     // Construct the road view URL with the extracted latitude and longitude
        //     let roadViewUrl = `https://roadview.planninglabs.nyc/view/${lng}/${lat}`;
        
        //     // Create the HTML content for the popup
        //     let popupContent = `
        //         ADNY Identified Public Space
        //         <h1>${name}</h1>
        //         <br>
        //         ${detail}
        //         <br>
        //         ${size} sqf | ${hours}
        //         <br>
        //         <a href="${roadViewUrl}" target="_blank">See Road View</a>
        //     `;
        
        //     // Create a new popup and set its content
        //     new mapboxgl.Popup()
        //         .setLngLat(e.lngLat)
        //         .setHTML(popupContent)
        //         .addTo(map);
        // });

        //NYC DATA ON POPS
        
        map.addSource('nyc-pops', {
            type: 'geojson',
            data: 'https://data.cityofnewyork.us/resource/rvih-nhyn.geojson?$limit=1000'
        });
        map.addLayer({
            'id': 'nyc-pops-points',
            'type': 'circle',
            'source': 'nyc-pops',
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

        map.on('click', 'nyc-pops-points', function(e){
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
            data: 'https://data.cityofnewyork.us/resource/buis-pvji.geojson?$limit=2000&$where=block%20<=%20130%20AND%20borough=%27MN%27'
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
                'fill-opacity': 0.2
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

        // NYC Street Construction
        const todayFormatted = getFormattedDate();
        console.log(`https://data.cityofnewyork.us/resource/i6b5-j7bu.geojson?$where=within_circle(the_geom, 40.707636, -74.0130, 900) AND work_start_date >= ${todayFormatted} AND work_end_date >= ${todayFormatted}`)
        map.addSource('nyc-street-construction-block', {
            type: 'geojson',
            data: `https://data.cityofnewyork.us/resource/i6b5-j7bu.geojson?$where=within_circle(the_geom, 40.707636, -74.0130, 900) AND work_start_date <= '${todayFormatted}' AND work_end_date >= '${todayFormatted}'`
        });
        map.addLayer({
            'id': 'nyc-street-construction',
            'type': 'line',
            'source': 'nyc-street-construction-block',
            'paint': {
                'line-color': '#FFBF00', 
                'line-width': 10,
                'line-opacity': .7
            },
            'layout': {
                'visibility': 'none'
                }
        });

        map.on('click', 'nyc-street-construction', function(e){
            let name = e.features[0].properties["onstreetname"];
            let from = e.features[0].properties["fromstreetname"];
            let to = e.features[0].properties["tostreetname"];
            let date = new Date(e.features[0].properties["work_end_date"]);
            let year = date.getFullYear();
            let month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based (0 = January)
            let day = String(date.getDate()).padStart(2, '0');
            let formattedDate = `${year}-${month}-${day}`;
            let purpose = e.features[0].properties['purpose']
            let purposeFormated = purpose.charAt(0).toUpperCase() + purpose.substring(1).toLowerCase()

        
            new mapboxgl.Popup()
                .setLngLat(e.lngLat)
                .setHTML("DOT Street Construction <br> <h1>"+ toTitleCase(name) + '</h1> <br>Between ' + toTitleCase(from) + ' and ' + toTitleCase(to) + '<br><br> Purpose: "' + purposeFormated + '."<br>Ends: ' + formattedDate)
                .addTo(map);
        });


        //NYC Street Condition
        map.addSource('nyc-street-conditions', {
            type: 'geojson',
            data: 'https://data.cityofnewyork.us/resource/6yyb-pb25.geojson?$where=within_circle(the_geom,%2040.707636,%20-74.0130,%20900)'
        });
        map.addLayer({
            'id': 'nyc-pavement-rating',
            'type': 'line',
            'source': 'nyc-street-conditions',
            'paint': {
                'line-color': [
                    'match',
                    ['get', 'ratinglaye'], // Get the value from the 'ratinglaye' field
                    'GOOD', '#3240a8',     // Blue for 'GOOD'
                    'FAIR', '#ADD8E6',     // Light blue for 'FAIR'
                    'POOR', '#FF0000',     // Red for 'POOR'
                    /* fallback */ '#AAAAAA'  // Default color if no match
                ],
                'line-width': 3,
                'line-opacity': 0.7,
            },
            'layout': {
                // Make the layer visible by default.
                'visibility': 'none'
                }
        });

        map.on('click', 'nyc-pavement-rating', function(e){
            let name = e.features[0].properties["onstreetna"];
            let from = e.features[0].properties["fromstreet"];
            let to = e.features[0].properties["tostreetna"];
            let date = new Date(e.features[0].properties["inspection"]);
            let year = date.getFullYear();
            let month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based (0 = January)
            let day = String(date.getDate()).padStart(2, '0');
            let formattedDate = `${year}-${month}-${day}`;
            let rating = e.features[0].properties['manualrati']

        
            new mapboxgl.Popup()
                .setLngLat(e.lngLat)
                .setHTML("DOT Pavement Rating <br> <h1>"+ toTitleCase(name) + '</h1> <br>Between ' + toTitleCase(from) + ' and ' + toTitleCase(to) + '<br> Rating: ' + rating + '/10  |  Inspected ' + formattedDate)
                .addTo(map);
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
        //         map.setFilter('nyc-pops-points', popFilter);

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
        // console.log('Layer IDs:', layerIds);

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
        // console.log('Longitude: ' + lngLat.lng + ', Latitude: ' + lngLat.lat+ ', Zoom: ' + zoom);
    });



    // Function to update the legend based on visible layers
    function updateLegend() {
        const legendContainer = document.getElementById('legend');
        legendContainer.innerHTML = '<h3>Legend</h3>'; // Reset legend content

        // Get a list of visible layers
        const visibleLayers = map.getStyle().layers.filter(layer => {
            return (
                map.getLayoutProperty(layer.id, 'visibility') === 'visible' &&
                layer.id !== 'background' // Exclude the background layer from legend
            );
        });

        // Generate legend items for each visible layer
        visibleLayers.forEach(layer => {
            const layerId = layer.id;
            const layerName = transformLayerId(layerId); // Transform layer ID for display
            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';
            legendItem.innerHTML = `
                <span class="legend-icon" style="background-color: ${getLayerColor(layerId)};"></span>
                <span class="legend-label">${layerName}</span>
            `;
            legendContainer.appendChild(legendItem);
        });
    }

    // After the last frame rendered before the map enters an "idle" state.
    map.on('idle', () => {
    // If these two layers were not added to the map, abort 
    if (!map.getLayer('adny-pedestrian-estimation') || !map.getLayer('nyc-parks-polygons')|| !map.getLayer('nyc-train-lines')|| !map.getLayer('nyc-pops-points')|| !map.getLayer('adny-public-spaces')|| !map.getLayer('nyc-openstreet-lines')|| !map.getLayer('exteros-locations')) {
    return;
    }
    
    // Enumerate ids of the layers.
    const toggleableLayerIds = [
            "adny-public-spaces",
            "adny-pedestrian-estimation",
            "nyc-pops-points",
            "nyc-parks-polygons",
            "nyc-openstreet-lines",
            "nyc-train-lines",
            "nyc-landmarks",
            "nyc-active-sheds",
            "exteros-locations",
            "adny-art",
            "adny-events",
            "nyc-aerial",
            "nyc-pavement-rating",
            'nyc-street-construction'

        ];
    const offLayersIds = [
        'nyc-pavement-rating',
        'nyc-parks-polygons',
        'nyc-pops-points',
        'nyc-landmarks',
        'nyc-active-sheds',
        'exteros-locations',
        'adny-art',
        'adny-events',
        "nyc-aerial",
        'nyc-street-construction'

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
        
        // Use the list in the if statement
        if (!offLayersIds.includes(link.id)) {
            link.className = 'activeToggle';
        }

        
        // Show or hide layer when the toggle is clicked.
        link.onclick = function (e) {
            const clickedLayer = this.id;
            const clickedLayerLegend = this.id + "-icon"
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
                const legend = document.getElementById(clickedLayerLegend)
                if (legend) {legend.classList.add("off")}
                if (clickedLayer == 'adny-pedestrian-estimation'){
                    toggleMouseMoveListener(false)
                }
            } else {
                this.className = 'activeToggle';
                const legend = document.getElementById(clickedLayerLegend)

                if (legend) {legend.classList.remove("off")}
                // this.parentElement.className = 'activeButton';
                map.setLayoutProperty(
                    clickedLayer,
                    'visibility',
                    'visible'
                );
                if (clickedLayer == 'adny-pedestrian-estimation'){
                    toggleMouseMoveListener(true)
                }
            }
        };  
        
        const menus = document.getElementById('menu');
        // toggle.appendChild(link)
        menus.appendChild(link);
        }
        // updateLegend()
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

    // function downloadMapImage() {
    //     var canvas = map.getCanvas();
    //     var image = canvas.toDataURL('image/png');

    //     // Create a temporary anchor element
    //     var link = document.createElement('a');
    //     link.href = image;
    //     link.download = 'map_image.png';
    //     document.body.appendChild(link);

    //     // Trigger the download
    //     link.click();

    //     // Clean up
    //     document.body.removeChild(link);
    // }

    // // Add click event listener to download button
    // document.getElementById('downloadButton').addEventListener('click', function() {
    //     downloadMapImage();
    // });

    // Function to download map image with HTML elements
    function downloadMapImage() {
        // Combine map and HTML elements into a single container for capture
        var mapContainer = document.getElementById('mapContainer');

        // Use html2canvas to capture the combined container
        html2canvas(mapContainer).then(function(canvas) {
            // Convert canvas to image URL
            var imageURL = canvas.toDataURL('image/png');

            // Create a temporary anchor element
            var link = document.createElement('a');
            link.href = imageURL;
            link.download = 'map_image.png';
            document.body.appendChild(link);

            // Trigger the download
            link.click();

            // Clean up
            document.body.removeChild(link);
        });
    }

    // Add click event listener to download button
    document.getElementById('downloadButton').addEventListener('click', function() {
        downloadMapImage();
    });


    document.getElementById('dataDownloadButton').addEventListener('click', async () => {
        const today = new Date().toISOString().split('T')[0];

        // Iterate over each dataset and initiate file download
        for (const dataset of datasets) {
            const { name, endpoint, fileType } = dataset;
    
            if (fileType === 'geojson') {
                // Download CSV from endpoint
                const filename = `${name}-${today}.geojson`;
                await downloadCsvFromEndpoint(endpoint, filename);
            } else if (fileType === 'csv') {
                // Convert CSV to GeoJSON and save the file
                const filename = `${name}-${today}.csv`;
                await downloadCsvFromEndpoint(endpoint, filename);
            }
        }
    
        // All files have been downloaded or generated
        // console.log('All files downloaded or generated successfully.');
    });
    
    // Function to fetch CSV data from endpoint and initiate download
    async function downloadCsvFromEndpoint(endpoint, filename) {
        const response = await fetch(endpoint);
        const csvData = await response.text();
        const csvBlob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });

        // Create download link for CSV file
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(csvBlob);
        downloadLink.download = filename;
        downloadLink.style.display = 'none';
        document.body.appendChild(downloadLink);

        // Trigger download when link is clicked
        downloadLink.click();

        // Clean up: remove the download link element
        document.body.removeChild(downloadLink);
    }
});