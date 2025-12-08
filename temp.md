Skip to main content
Google Maps Platform
Maps Platform
Overview
Products
Pricing
Documentation

Blog
Community

Search
/

English
Web
Maps JavaScript API
Places UI Kit
Get Started
Contact sales
Guides
Reference
Samples
Resources
Legacy
Filter

reviews Share your input on your UI Kit experience.
Home
Products
Google Maps Platform
Documentation
Web
Maps JavaScript API
Places UI Kit
Was this helpful?

Send feedbackPlace Details Elements

bookmark_border
Spark icon
Page Summary
Select platform: Android iOS JavaScript
The Place Details Element and Place Details Compact Element are HTML elements that render details for a place:

The PlaceDetailsElement supports all visualizable Place data, and may include multiple photos.
The PlaceDetailsCompactElement is designed to consume minimal space and display a concise set of information about a place, including name, address, rating, etc. It may also include a single photo.
Place Details Element
Click a marker on the map to see its place details in a Place Details Element.


The PlaceDetailsElement supports a broad range of content elements, including full opening hours, website, phone number, editorial summary, type-specific highlights, reviews, plus code, and feature lists.

To display place details on a map, add a gmp-place-details element to the gmp-map element on the HTML page. Include a child element, gmp-place-details-place-request, to select the place. This can be a Place object, a place ID, or a Place's resource name:


<gmp-map center="47.759737, -122.250632" zoom="16" map-id="DEMO_MAP_ID">
    <gmp-advanced-marker></gmp-advanced-marker>
</gmp-map>

<gmp-map center="47.759737, -122.250632" zoom="16" map-id="DEMO_MAP_ID">
  <div class="widget-container" slot="control-inline-start-block-start">
    <gmp-place-details>
      <gmp-place-details-place-request place="ChIJC8HakaIRkFQRiOgkgdHmqkk"></gmp-place-details-place-request>
      <gmp-place-all-content></gmp-place-all-content>
    </gmp-place-details>
  </div>
  <gmp-advanced-marker></gmp-advanced-marker>
</gmp-map>
Tip: You can find the place ID of a specific place using the place ID finder.
Configure the content
You can control the specific place content displayed by the gmp-place-details element using a nested gmp-place-content-config element to select and configure the place details, as shown in this example:


<gmp-map center="47.759737, -122.250632" zoom="16" map-id="DEMO_MAP_ID">
  <div class="widget-container" slot="control-inline-start-block-start">
    <gmp-place-details>
      <gmp-place-details-place-request place="ChIJC8HakaIRkFQRiOgkgdHmqkk"></gmp-place-details-place-request>
      <gmp-place-content-config>
        <gmp-place-address></gmp-place-address>
        <gmp-place-rating></gmp-place-rating>
        <gmp-place-type></gmp-place-type>
        <gmp-place-price></gmp-place-price>
        <gmp-place-accessible-entrance-icon></gmp-place-accessible-entrance-icon>
        <gmp-place-opening-hours></gmp-place-opening-hours>
        <gmp-place-website></gmp-place-website>
        <gmp-place-phone-number></gmp-place-phone-number>
        <gmp-place-summary></gmp-place-summary>
        <gmp-place-type-specific-highlights></gmp-place-type-specific-highlights>
        <gmp-place-reviews></gmp-place-reviews>
        <gmp-place-feature-list></gmp-place-feature-list>
        <gmp-place-media lightbox-preferred></gmp-place-media>
        <gmp-place-attribution light-scheme-color="gray" dark-scheme-color="white"></gmp-place-attribution>
      </gmp-place-content-config>
    </gmp-place-details>
  </div>
  <gmp-advanced-marker></gmp-advanced-marker>
</gmp-map>
The gmp-place-content-config element itself contains a number of child content elements, and each selects a corresponding place detail to display: PlaceAddressElement selects the place's address, PlacePriceElement selects the place's price level, etc. The order of child elements is irrelevant, as the selected details are always rendered in a fixed predefined order.

Some of these elements can be further configured using content-specific attributes:

The gmp-place-media element is used to display a single photo, and includes a lightbox-preferred attribute that opens the photo in a lightbox when clicked. Lightbox is disabled by default.
The gmp-place-attribution element is used to display the source of the photo. The light-scheme-color and dark-scheme-color attributes are used to set the color of the attribution text in light and dark mode.
See the PlaceContentConfigElement reference documentation for more information about all supported content elements.
For simplicity, the gmp-place-content-config element can be replaced with gmp-place-all-content to show all details available in the Place Details element, or with gmp-place-standard-content to display a standard configuration.

Configure the appearance
The recommended width range for the gmp-place-details element is 250px-400px. Widths less than 250px may not display correctly. Set the height to suit your application. The Place Details element is designed to scroll within the allotted space as needed.

The gmp-place-details element also supports a variety of custom CSS properties to configure the element's colors and fonts. See Places UI Kit Custom Styling for more details.

Important: When making visual modifications, you must adhere to the Attribution requirements.
See the complete code example
JavaScript
CSS
HTML

// Use querySelector to select elements for interaction.
const map = document.querySelector('gmp-map');
const placeDetails = document.querySelector('gmp-place-details');
const placeDetailsRequest = document.querySelector('gmp-place-details-place-request');
const marker = document.querySelector('gmp-advanced-marker');
let center = { lat: 47.759737, lng: -122.250632 };
async function initMap() {
    // Request needed libraries.
    (await google.maps.importLibrary('maps'));
    (await google.maps.importLibrary('marker'));
    (await google.maps.importLibrary('places'));
    // Hide the map type control.
    map.innerMap.setOptions({ mapTypeControl: false });
    // Function to update map and marker based on place details
    const updateMapAndMarker = () => {
        if (placeDetails.place && placeDetails.place.location) {
            let adjustedCenter = offsetLatLngRight(placeDetails.place.location, -0.005);
            map.innerMap.panTo(adjustedCenter);
            map.innerMap.setZoom(16); // Set zoom after panning if needed
            marker.position = placeDetails.place.location;
            marker.collisionBehavior =
                google.maps.CollisionBehavior.REQUIRED_AND_HIDES_OPTIONAL;
            marker.style.display = 'block';
        }
    };
    // Set up map once widget is loaded.
    placeDetails.addEventListener('gmp-load', (event) => {
        updateMapAndMarker();
    });
    // Add an event listener to handle clicks.
    map.innerMap.addListener('click', async (event) => {
        marker.position = null;
        event.stop();
        if (event.placeId) {
            // Fire when the user clicks a POI.
            placeDetailsRequest.place = event.placeId;
            updateMapAndMarker();
        }
        else {
            // Fire when the user clicks the map (not on a POI).
            console.log('No place was selected.');
            marker.style.display = 'none';
        }
    });
}
// Helper function to offset marker placement for better visual appearance.
function offsetLatLngRight(latLng, longitudeOffset) {
    const newLng = latLng.lng() + longitudeOffset;
    return new google.maps.LatLng(latLng.lat(), newLng);
}
initMap();
Code Tutor
expand_more
Note: The JavaScript is compiled from the TypeScript snippet.
Place Details Compact Element
Click a marker on the map to see its place details in a Place Details Compact Element.


The PlaceDetailsCompactElement renders details for a selected place using minimal space. This may be useful in an info window highlighting a place on a map, in a social media experience like sharing a location in a chat, as a suggestion for selecting your current location, or within a media article to reference the place on Google Maps.The PlaceDetailsCompactElement can display name, address, rating, type, price, accessibility icon, open status, and a single photo. It can be displayed horizontally or vertically, as selected by the orientation attribute.

In the following snippet, gmp-place-details-compact is nested within a gmp-map element, with orientation set to horizontal. An additional attribute, truncation-preferred, truncates certain content to fit on one line instead of wrapping. The gmp-place-details-compact element contains a child element, gmp-place-details-place-request, to select the place. This can be a Place object, a place ID, or a Place's resource name.


<gmp-map center="47.75972, -122.25094" zoom="19" map-id="DEMO_MAP_ID">
  <gmp-place-details-compact orientation = "horizontal" truncation-preferred slot="control-block-start-inline-center" >
    <gmp-place-details-place-request place = "ChIJC8HakaIRkFQRiOgkgdHmqkk"></gmp-place-details-place-request>
    <gmp-place-content-config>
        <gmp-place-media lightbox-preferred></gmp-place-media>
        <gmp-place-rating></gmp-place-rating>
        <gmp-place-type></gmp-place-type>
        <gmp-place-price></gmp-place-price>
        <gmp-place-accessible-entrance-icon></gmp-place-accessible-entrance-icon>
        <gmp-place-open-now-status></gmp-place-open-now-status>
        <gmp-place-attribution light-scheme-color="gray" dark-scheme-color="white"></gmp-place-attribution>
    </gmp-place-content-config>
  </gmp-place-details-compact>
  <gmp-advanced-marker></gmp-advanced-marker>
</gmp-map>
Tip: You can find the place ID of a specific place using the place ID finder.
Configure the content
You can control the specific place content displayed by the gmp-place-details-compact element using a nested gmp-place-content-config element to select and configure the place details. The gmp-place-content-config element itself contains a number of child content elements, and each selects a corresponding place detail to display. The order of child elements is irrelevant, as the selected details are always rendered in a fixed predefined order. Some of these elements can be further configured using content-specific attributes.

See the PlaceContentConfigElement reference documentation for more information about all supported content elements.
For simplicity, the gmp-place-content-config element can be replaced with gmp-place-all-content to show all details available in the Place Details Compact element, or with gmp-place-standard-content to display a standard configuration.

Configure the appearance
The recommended width range for the gmp-place-details-compact element in vertical orientation is 180px-300px. Widths less than 160px may not display correctly. Do not set a fixed height.

The recommended width range for the gmp-place-details-compact element in horizontal orientation is 180px-500px. Widths less than 160px may not display correctly. At widths less than 350px, the thumbnail image will not be shown. Do not set a fixed height.

The gmp-place-details-compact element also supports a variety of custom CSS properties to configure the element's colors and fonts. See Places UI Kit Custom Styling for more details.

Important: When making visual modifications, you must adhere to the Attribution requirements.
See a complete code example
This example demonstrates adding a PlaceDetailsCompactElement to a map programmatically using an AdvancedMarkerElement.

JavaScript
CSS
HTML

// Use querySelector to select elements for interaction.
const mapContainer = document.getElementById('map-container');
const placeDetails = document.querySelector('gmp-place-details-compact');
const placeDetailsRequest = document.querySelector('gmp-place-details-place-request');
let gMap;
let marker;
async function initMap() {
    const { PlaceDetailsCompactElement, PlaceDetailsPlaceRequestElement } = (await google.maps.importLibrary('places'));
    const { Map } = (await google.maps.importLibrary('maps'));
    const { AdvancedMarkerElement } = (await google.maps.importLibrary('marker'));
    gMap = new Map(mapContainer, { mapId: 'DEMO_MAP_ID' });
    marker = new AdvancedMarkerElement({ map: gMap });
    // Hide the map type control.
    gMap.setOptions({ mapTypeControl: false });
    // Set up map, marker, and infowindow once widget is loaded.
    placeDetails.style.visibility = 'visible';
    placeDetails.addEventListener('gmp-load', (event) => {
        console.log('placeDetails initialized!');
        updateMapAndMarker();
    });
    // Add an event listener to handle clicks.
    gMap.addListener('click', async (event) => {
        event.stop();
        // Fire when the user clicks on a POI.
        if (event.placeId) {
            console.log('clicked on POI');
            console.log(event.placeId);
            placeDetailsRequest.place = event.placeId;
            updateMapAndMarker();
        }
        else {
            // Fire when the user clicks the map (not on a POI).
            console.log('No place was selected.');
        }
    });
    // Function to update map, marker, and infowindow based on place details
    const updateMapAndMarker = () => {
        console.log('function called');
        if (placeDetails.place && placeDetails.place.location) {
            marker.gMap = null;
            let adjustedCenter = offsetLatLngRight(placeDetails.place.location, 0.002);
            gMap.panTo(adjustedCenter);
            gMap.setZoom(16); // Set zoom after panning if needed
            marker.content = placeDetails;
            marker.position = placeDetails.place.location;
        }
        else {
            console.log('else');
        }
    };
}
// Helper function to offset marker placement for better visual appearance.
function offsetLatLngRight(latLng, latitudeOffset) {
    const newLat = latLng.lat() + latitudeOffset;
    return new google.maps.LatLng(newLat, latLng.lng());
}
initMap();
Code Tutor
expand_more
Note: The JavaScript is compiled from the TypeScript snippet.
Was this helpful?

Send feedback
Except as otherwise noted, the content of this page is licensed under the Creative Commons Attribution 4.0 License, and code samples are licensed under the Apache 2.0 License. For details, see the Google Developers Site Policies. Java is a registered trademark of Oracle and/or its affiliates.

Last updated 2025-11-21 UTC.

Stack OverflowStack Overflow
Ask a question under the google-maps tag.
GitHubGitHub
Fork our samples and try them yourself.
DiscordDiscord
Chat with fellow developers about Google Maps Platform.
Issue TrackerIssue Tracker
Something wrong? Send us a bug report!
Learn More
FAQ
Capabilities Explorer
Tutorials
Platforms
Android
iOS
Web
Web Services
Product Info
Pricing and Plans
Contact Sales
Support
Terms of Service
Google Developers
Android
Chrome
Firebase
Google Cloud Platform
Google AI
All products
Terms
Privacy

English
Page info
bug_report
fullscreen
close
On this page
The new page has loaded.

/* 
 * Optional: Makes the sample page fill the window. 
 */
html,
body {
    display: flex; /* Use flexbox for layout */
    justify-content: center; /* Center the content horizontally */
    align-items: flex-start; /* Align items to the top */
    width: 100%;
}

h1 {
    font-size: 16px;
    text-align: center;
}

gmp-map {
    height: 500px;
}

gmp-place-details {
    border-radius: 0px;
    margin: 20px;
    width: 400px;
    height: 500px;
    margin-top: 0px;
}

gmp-advanced-marker {
    display: none;
}

.widget-container {
    min-width: 400px;
    overflow-y: none;
    overflow-x: none;
}

<!doctype html>
<html>
    <head>
        <title>Click on the map to view place details</title>
        <meta charset="utf-8" />
        <link rel="stylesheet" href="style.css" />
        <script type="module" src="./index.js"></script>
    </head>
    <body>
        <gmp-map center="47.759737, -122.250632" zoom="16" map-id="DEMO_MAP_ID">
            <gmp-advanced-marker></gmp-advanced-marker>
        </gmp-map>
        <div class="widget-container" slot="control-inline-start-block-start">
            <gmp-place-details>
                <gmp-place-details-place-request
                    place="ChIJC8HakaIRkFQRiOgkgdHmqkk"></gmp-place-details-place-request>
                <gmp-place-all-content></gmp-place-all-content>
            </gmp-place-details>
        </div>
        <script>
            ((g) => {
                var h,
                    a,
                    k,
                    p = 'The Google Maps JavaScript API',
                    c = 'google',
                    l = 'importLibrary',
                    q = '__ib__',
                    m = document,
                    b = window;
                b = b[c] || (b[c] = {});
                var d = b.maps || (b.maps = {}),
                    r = new Set(),
                    e = new URLSearchParams(),
                    u = () =>
                        h ||
                        (h = new Promise(async (f, n) => {
                            await (a = m.createElement('script'));
                            e.set('libraries', [...r] + '');
                            for (k in g)
                                e.set(
                                    k.replace(
                                        /[A-Z]/g,
                                        (t) => '_' + t[0].toLowerCase()
                                    ),
                                    g[k]
                                );
                            e.set('callback', c + '.maps.' + q);
                            a.src =
                                `https://maps.${c}apis.com/maps/api/js?` + e;
                            d[q] = f;
                            a.onerror = () =>
                                (h = n(Error(p + ' could not load.')));
                            a.nonce =
                                m.querySelector('script[nonce]')?.nonce || '';
                            m.head.append(a);
                        }));
                d[l]
                    ? console.warn(p + ' only loads once. Ignoring:', g)
                    : (d[l] = (f, ...n) =>
                          r.add(f) && u().then(() => d[l](f, ...n)));
            })({ key: 'AIzaSyA6myHzS10YXdcazAFalmXvDkrYCp5cLc8', v: 'weekly' });
        </script>
    </body>
</html>