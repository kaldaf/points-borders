const points = [{
    points: {
        lat: 49.1944522,
        lon: 16.5995939
    },
    title: 'Hrad Špilberk'
},
{
    points: {
        lat: 49.1905822,
        lon: 16.6128025
    },
    title: 'Brno hlavní nádraží'
}
];

let actualLayer;


const center = SMap.Coords.fromWGS84(16.5957639, 49.1994337);
let m = new SMap(JAK.gel("m"), center, 14);
m.addDefaultLayer(SMap.DEF_BASE).enable();
m.addDefaultControls();

let layer = new SMap.Layer.Marker();
m.redraw();
points.forEach((e, i) => {
let c = SMap.Coords.fromWGS84(e.points.lon, e.points.lat);
let pointMarker = new SMap.Marker(c, i, {
    title: e.title
});
layer.addMarker(pointMarker);
})
m.addLayer(layer);
layer.enable();

var signals = m.getSignals();
m.setCursor("pointer");

let selectedCoords = []

let geoLayer = new SMap.Layer.Geometry();
m.addLayer(geoLayer);
geoLayer.enable();


let hintLayer = new SMap.Layer.Geometry();
m.addLayer(hintLayer);
hintLayer.enable();


const kliknuto = function (signal) {
if (actualLayer == null) {
    const event = signal.data.event;
    const coords = SMap.Coords.fromEvent(event, m);
    new SMap.Geocoder.Reverse(coords, odpoved);
}
}

const odpoved = function (geocoder) {
const geo = geocoder.getResults();
selectedCoords.push(SMap.Coords.fromWGS84(geo.coords.x, geo.coords.y));

const polyOptions = {
    color: "#0f0"
};

geoLayer.clear();
geoLayer.removeAll();

/*CREATE POLYGON*/
const polygon = new SMap.Geometry(SMap.GEOMETRY_POLYGON, null, selectedCoords, polyOptions);
geoLayer.addGeometry(polygon);


/* HINT PATH */
JAK.Events.addListener(JAK.gel("m"), "mousemove", (event) => {
    var tmpData = SMap.Coords.fromEvent(event, m);
    hintLayer.clear();
    hintLayer.removeAll();
    hintLayer.redraw();

    const lastPoints = [selectedCoords[selectedCoords.length - 1], tmpData]
    const hintPolygon = new SMap.Geometry(SMap.GEOMETRY_POLYGON, null, lastPoints, polyOptions);
    hintLayer.addGeometry(hintPolygon);
});

signals.addListener(window, "map-click", kliknuto);

if (selectedCoords.length > 2) {
    points.forEach((e) => {
        const editedPoints = SMap.Coords.fromWGS84(e.points.lon, e.points.lat);
        if (SMap.Util.pointInPolygon([editedPoints.x, editedPoints.y], selectedCoords.map(Object
                .values))) {
            alert(e.title + " PATŘÍ")
        }
    })
}
}

signals.addListener(window, "map-click", kliknuto);