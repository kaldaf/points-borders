Vue.component(('map-main'), {
    template: `
    <div class="map-main">
        <button class="operation-btn" @click="handleDraw()">
            <img :src="draw ? 'draw.svg' : 'stop-draw.svg'">
            <span>{{draw ? 'Nakreslit oblast' : 'Začít znovu'}}</span>
        </button>
        <div id="map" style="width: 100vw; height: 100vh;"></div>
        <div class="locations-results" v-if="includedLocations.length > 0"> 
            <h3>Výsledky:</h3>
            <ul>
                <li v-for="location in includedLocations">{{location}}</li>
            </ul>
        </div>
    </div>
    `,

    data() {
        return {
            draw: false,
            map: null,
            geoLayer: new SMap.Layer.Geometry(),
            hintLayer: new SMap.Layer.Geometry(),
            signals: null,
            markerLayer: new SMap.Layer.Marker(),
            locations: [{
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
                },
                {
                    points: {
                        lat: 49.1957206,
                        lon: 16.6081964
                    },
                    title: 'NEWTON University'
                },
                {
                    points: {
                        lat: 49.1941453,
                        lon: 16.6082592
                    },
                    title: 'Lidl'
                },
                {
                    points: {
                        lat: 49.1988258,
                        lon: 16.6052264
                    },
                    title: 'Masarykova univerzita'
                },
                {
                    points: {
                        lat: 49.2071503,
                        lon: 16.6160397
                    },
                    title: 'Vila Tugendhat - Památka UNESCO'
                },
                {
                    points: {
                        lat: 49.1977642,
                        lon: 16.6044039
                    },
                    title: 'Ústavní soud'
                },
                {
                    points: {
                        lat: 49.1954728,
                        lon: 16.6073342
                    },
                    title: 'Radegast Sportbar'
                },
                {
                    points: {
                        lat: 49.1912400,
                        lon: 16.5990900
                    },
                    title: 'Fakultní nemocnice u sv. Anny v Brně'
                },
                {
                    points: {
                        lat: 49.1876667,
                        lon: 16.5790769
                    },
                    title: 'BVV - Veletrhy Brno'
                },
            ],
            center: SMap.Coords.fromWGS84(16.5957639, 49.1994337),
            selectedCoords: [],
            polyOptions: {
                color: "#80ebff",
                outlineColor: "#0c57fb"
            },
            includedLocations: [],
            zoomOnCoords: true
        }
    },
    methods: {
        handleDraw: function () {
            //this.draw = !this.draw;
            //window.location.reload();
            this.includedLocations = [];
            this.selectedCoords = [];
            this.map = null;
            this.geoLayer = new SMap.Layer.Geometry();
            this.hintLayer = new SMap.Layer.Geometry();
            this.signals = null;
            this.markerLayer = new SMap.Layer.Marker();
            this.initMap();

        },
        initMap: function () {
            this.map = new SMap(document.querySelector("#map"), this.center, 14);
            this.map.addDefaultLayer(SMap.DEF_BASE).enable();
            this.map.addControl(new SMap.Control.Mouse(SMap.MOUSE_PAN | SMap.MOUSE_WHEEL | SMap.MOUSE_ZOOM, {
                minDriftSpeed: 1 / 0
            }));
            this.map.addControl(new SMap.Control.Keyboard(SMap.KB_PAN | SMap.KB_ZOOM, {
                focusedOnly: false
            }));
            this.map.addControl(new SMap.Control.Zoom({}, {
                titles: ["Přiblížit", "Oddálit"],
                showZoomMenu: false
            }), {
                right: "-1.5rem",
                bottom: "7rem"
            });


            if (this.zoomOnCoords) {
                const computedCoords = [];

                this.locations.forEach((e) => {
                    computedCoords.push(SMap.Coords.fromWGS84(e.points.lon, e.points.lat));
                });
                const zoomCoords = this.map.computeCenterZoom(computedCoords)
                this.map.setCenterZoom(zoomCoords[0], zoomCoords[1])
            }

            /* HELPERS */
            this.map.redraw();
            this.addPoints();
            this.signals = this.map.getSignals();
            this.map.setCursor("pointer");
            this.enableLayers();

            this.signals.addListener(window, "map-click", this.clicked);
        },
        addPoints: function () {
            this.locations.forEach((e, i) => {
                let c = SMap.Coords.fromWGS84(e.points.lon, e.points.lat);

                const marker = JAK.mel(
                    "div", {
                        title: e.title,
                    }, {
                        width: "0.75rem",
                        height: "0.75rem",
                        background: "#0c57fb",
                        borderRadius: "50%",
                        border: "1px solid #fff",
                        cursor: "pointer",
                        marginTop: "1.5rem"
                    }
                );
                const pointMarker = new SMap.Marker(c, i, {
                    url: marker
                });
                this.markerLayer.addMarker(pointMarker);
            })
            this.map.addLayer(this.markerLayer);
            this.markerLayer.enable();
        },
        enableLayers: function () {
            this.map.addLayer(this.geoLayer);
            this.geoLayer.enable();
            this.map.addLayer(this.hintLayer);
            this.hintLayer.enable();
        },
        clicked: function (signal) {
            const event = signal.data.event;
            const coords = SMap.Coords.fromEvent(event, this.map);
            new SMap.Geocoder.Reverse(coords, this.results);
        },
        results: function (geocoder) {
            const geo = geocoder.getResults();
            this.selectedCoords.push(SMap.Coords.fromWGS84(geo.coords.x, geo.coords.y));
            this.includedLocations = [];

            this.geoLayer.clear();
            this.geoLayer.removeAll();

            /*CREATE POLYGON*/
            const polygon = new SMap.Geometry(SMap.GEOMETRY_POLYGON, null, this.selectedCoords, this.polyOptions);
            this.geoLayer.addGeometry(polygon);

            this.pathHint();

            if (this.selectedCoords.length > 2) {
                this.locations.forEach((e) => {
                    const editedPoints = SMap.Coords.fromWGS84(e.points.lon, e.points.lat);
                    if (SMap.Util.pointInPolygon([editedPoints.x, editedPoints.y], this.selectedCoords.map(Object
                            .values))) {
                        //alert(e.title + " PATŘÍ")
                        if (!this.includedLocations.includes(e.title)) {
                            this.includedLocations.push(e.title);
                        }
                    }
                })
            }
        },
        pathHint: function () {
            /* HINT PATH */
            JAK.Events.addListener(document.querySelector("#map"), "mousemove", (event) => {
                const tmpData = SMap.Coords.fromEvent(event, this.map);
                this.hintLayer.clear();
                this.hintLayer.removeAll();
                this.hintLayer.redraw();

                if (1 >= this.selectedCoords.length) {
                    const lastPoints = [this.selectedCoords[this.selectedCoords.length - 1], tmpData]
                    const hintPolygonLast = new SMap.Geometry(SMap.GEOMETRY_POLYGON, null, lastPoints, this.polyOptions);
                    this.hintLayer.addGeometry(hintPolygonLast);
                }


                if (this.selectedCoords.length >= 2) {
                    const lastPoints = [this.selectedCoords[this.selectedCoords.length - 1], tmpData]
                    const hintPolygonLast = new SMap.Geometry(SMap.GEOMETRY_POLYGON, null, lastPoints, this.polyOptions);
                    this.hintLayer.addGeometry(hintPolygonLast);

                    const fisrtPoints = [this.selectedCoords[0], tmpData]
                    const hintPolygonFirst = new SMap.Geometry(SMap.GEOMETRY_POLYGON, null, fisrtPoints, this.polyOptions);
                    this.hintLayer.addGeometry(hintPolygonFirst);
                }
            });
        }
    },
    mounted() {
        this.initMap();
    }
});

let app = new Vue({
    el: '#app',
    data: {}
})