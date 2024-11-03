M.AutoInit();
//caricamento pagina all'apertura sito/refresh pagina
$(document).ready(function(){
    //WIKIPEDIA LUOGHI D'INTERESSE
    function makeSPARQLQuery( endpointUrl, sparqlQuery, doneCallback ) {
        var settings = {
            headers: { Accept: 'application/sparql-results+json' },
            data: { query: sparqlQuery }
        };
        return $.ajax( endpointUrl, settings ).then( doneCallback );
    }
    
    //resize mappa 
    $('#mapid').height($('#mapdiv').height()-$('#mapnav').height());
    $('#mapid').css('margin-top','0px');
    $(window).on('resize',function() {
        $('#mapid').height($('#mapdiv').height()-$('#mapnav').height());
    });
    //caricamento file JSON
    $.getJSON("./data/file.json", function(data) {
        console.log(data);
        var map = L.map('mapid').setView([42.358381199999997, 10.922471399999999], 500);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        var markers = new L.MarkerClusterGroup();
        for(var obj of data.ristorantiebottegheXall.SelXall) {
            var str ='<div class="section" >';
            if (obj.nome != '')
                str+='<h5>'+obj.nome+'</h5>';
            if (obj.indirizzo != '') {
                str+='<p>Indirizzo: ' + obj.indirizzo;
                if (obj.cap != '')
                    str+=','+obj.cap;
                if (obj.comune != '')
                    str+=','+obj.comune;
                if (obj.provincia != '')
                    str+=','+obj.provincia;
                str+='.</p>';
            }
            if(obj.telefono != '')
                str+='<p>Telefono: '+ obj.telefono +' </p>';
            if(obj.email != '')
                str+='<p>E-mail: '+ obj.email +'</p>';
            if(obj.fax != '')
                str+='<p>Fax: '+ obj.fax +'</p>';
            str+='</div>';
            str+= '<div><button class="waves-effect waves-light btn-large red lighten-1 btnshowmore" lat="'+obj.lat+'" lon="'+obj.lon+'"><i class="material-icons left">info</i>nelle vicinanze</button></div>';
            var blueIcon = new L.Icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
              });
            var marker = L.marker([obj.lat, obj.lon], {icon: blueIcon})
            .bindPopup(str).openPopup();
            markers.addLayer(marker);
        }
        map.addLayer(markers);

        //autocomplete part
        var json= data;
        var json_autocomplete = {};
        for(var obj of json.ristorantiebottegheXall.SelXall) {
            json_autocomplete[obj.nome] = null;
        }
        console.log(json_autocomplete);
        $('#ricercapernome').autocomplete({
            data : json_autocomplete,
            limit : 5,
            minLength : 1,
            onAutocomplete: function(val) {
                // Callback function when value is autcompleted.
                $('#luoghinteresse').on('click',function() {
                    for(var obj of json.ristorantiebottegheXall.SelXall) {
                        if(obj.nome == val) {
                            console.log('trovato');
                            punto = L.latLng(obj.lat, obj.lon);
                            console.log(punto);
                            map.flyTo(punto);
                        }
                    }
                    console.log(val);
                });
              },
          });
        //evento ottenimento luoghi di interesse
        
        var prevlat = null;
        var prevlon = null;
        $(document).on('click','.btnshowmore',function() {
            var lat = $(this).attr('lat');
            var lon = $(this).attr('lon');
            if(lat != prevlat && lon != prevlon) {
                $('#sezinfo').empty();
                //INIZIO +lon+" "+lat+
                    var endpointUrl = 'https://query.wikidata.org/sparql',
                    sparqlQuery = "SELECT ?place (MIN(?location1) AS ?location) ?placeLabel (MIN(?image1) AS ?image) (MIN(?ind1) AS ?indirizzo) WHERE {\n" +
                        "  SERVICE wikibase:around {\n" +
                        "      ?place wdt:P625 ?location1 .\n" +
                        "      bd:serviceParam wikibase:center \"Point("+lon+" "+lat+")\"^^geo:wktLiteral .\n" +
                        "      bd:serviceParam wikibase:radius 5 . # in kilometers\n" +
                        "  }\n" +
                        "\n" +
                        "    ?place wdt:P31/wdt:P279* wd:Q33506.\n" +
                        "  SERVICE wikibase:label { bd:serviceParam wikibase:language 'it' }\n" +
                        "  BIND(geof:distance(?loc, ?location1) AS ?dist) .\n" +
                        "   OPTIONAL {\n" +
                        "     ?place  wdt:P18  ?image1 .\n" +
                        "     ?place wdt:P6375 ?ind1\n" +
                        "             \n" +
                        "   }\n" +
                        "} \n" +
                        "GROUP BY ?place ?placeLabel ?instanceLabel ?dist\n" +
                        "ORDER BY ASC(?dist)\n" +
                        "LIMIT 10 ";
                
                //FINE
                makeSPARQLQuery( endpointUrl, sparqlQuery, function( data ) {
                    console.log(lg_interesse);
                    var lg_interesse = data.results.bindings;
                    if(lg_interesse.length == 0)
                    {
                        $('#sezinfo').append('<blockquote class="flow-text" style="border-left: 5px solid #6e7aee;">Non è presente alcun Luogo Di Interesse nel raggio di 5 Km dal ristorante. </blockquote> ');
                    }
                    console.log(lg_interesse);
                    for(var obj of lg_interesse) {
                        var latlon = obj.location.value.slice(6, -1).split(' ');
                        var str='<div class="card"><div class="card-image">';
                        if(obj.hasOwnProperty('image'))
                        {
                            str+= '<img width="150" height="200" src="'+ obj.image.value +'">';
                        }
                        else
                        {
                            str+= '<img width="150" height="200" src="https://via.placeholder.com/150?text=Image+Not+Found">';
                        }
                        str+='</div><div class="card-content"><span class="card-title">'+obj.placeLabel.value+'</span><a class="btn-floating halfway-fab waves-effect waves-light indigo accent-2 flytoplace" lat="'+latlon[1]+'" lon="'+latlon[0]+'"><i class="material-icons">account_balance</i></a>';
                        if(obj.hasOwnProperty('indirizzo')) {
                            str+='<p>'+obj.indirizzo.value+'</p>';
                        }
                        str+='</div></div> </br>';
                        $('#sezinfo').append(str);
                        var redIcon = new L.Icon({
                            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                            iconSize: [25, 41],
                            iconAnchor: [12, 41],
                            popupAnchor: [1, -34],
                            shadowSize: [41, 41]
                        });
                        var marker = L.marker([latlon[1],latlon[0]], {icon: redIcon}).bindPopup('<div class="section center-align"><h6>'+obj.placeLabel.value+'</h6></div>').openPopup();
                        markers.removeLayer(marker)
                        markers.addLayer(marker);
                        map.addLayer(markers);
                    }
                });
            }
            prevlat = lat;
            prevlon = lon;
            $('.sidenav').sidenav('open');
        });
        $(document).on('click','#closesidenav',function() {
            $('.sidenav').sidenav('close');
        });
        $(document).on('click','.flytoplace',function() {
            var lat = $(this).attr('lat');
            var lon = $(this).attr('lon');
            var punto = L.latLng(lat, lon);
            map.flyTo(punto);
        });
    });
});