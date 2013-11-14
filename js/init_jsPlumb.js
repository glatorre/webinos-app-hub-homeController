var service_types = [
    "http://webinos.org/api/sensors/*",
    "http://webinos.org/api/actuators/*"
];

    var _initialised = false,
        connections = [],
        updateConnections = function(conn, remove) {
            if (!remove){
                connections.push(conn);

                if(conn.sourceId.indexOf("sensor") !== -1){
                    var param = conn.getParameters();
                    settingSensorConnection(conn.sourceId, conn.targetId, param.position);
                }else if(conn.sourceId.indexOf("userInput") !== -1){
                    var param = conn.getParameters();
                    settingUserInputConnection(conn.sourceId, conn.targetId, param.position);
                }else if(conn.sourceId.indexOf("operation") !== -1){
                    settingProcessingConnection(conn.sourceId, conn.targetId);
                }else if(conn.sourceId.indexOf("bool") !== -1){
                    settingProcessingConnection(conn.sourceId, conn.targetId);
                }
            }
            else {
                var idx = -1;
                for (var i = 0; i < connections.length; i++) {
                    if (connections[i] == conn) {
                        idx = i; break;
                    }
                }
                if (idx != -1) connections.splice(idx, 1);

                if(conn.sourceId.indexOf("sensor") !== -1){
                    var param = conn.getParameters();
                    removeInputConnection(conn.sourceId, conn.targetId, param.position);
                }else if(conn.sourceId.indexOf("userInput") !== -1){
                    var param = conn.getParameters();
                    removeInputConnection(conn.sourceId, conn.targetId, param.position);
                }else if(conn.sourceId.indexOf("operation") !== -1){
                    removeProcessingConnection(conn.sourceId, conn.targetId);
                }else if(conn.sourceId.indexOf("bool") !== -1){
                    removeProcessingConnection(conn.sourceId, conn.targetId);
                }

            }

            if (connections.length > 0) {
                for (var j = 0; j < connections.length; j++) {
                    s = "Source: " + connections[j].sourceId + " - Target: " + connections[j].targetId;
                    //alert(s);
                    var params = connections[j].getParameters();
                    //alert(params.position);
                }
            }
        };
    
    window.jsPlumbDemo = {
        init : function() {

            // setup jsPlumb defaults.
            jsPlumb.importDefaults({
                //DragOptions : { cursor: 'pointer', zIndex:2000 },
                PaintStyle : { strokeStyle:'#666' },
                EndpointStyle : { width:20, height:16, strokeStyle:'#666' },
                Endpoint : "Rectangle",
                Anchors : ["TopCenter", "TopCenter"]
            });                                             

            // bind to connection/connectionDetached events, and update the list of connections on screen.
            jsPlumb.bind("connection", function(info, originalEvent) {
                updateConnections(info.connection);
            });
            jsPlumb.bind("connectionDetached", function(info, originalEvent) {
                updateConnections(info.connection, true);
            });

            // three ways to do this - an id, a list of ids, or a selector (note the two different types of selectors shown here...anything that is valid jquery will work of course)
            var divsWithWindowClass = jsPlumb.CurrentLibrary.getSelector(".window");
            jsPlumb.draggable(divsWithWindowClass);


            // init         
            if (!_initialised) {
                $(".hide").click(function() {
                    jsPlumb.toggle($(this).attr("rel"));
                });
    
                $(".drag").click(function() {
                    var s = jsPlumb.toggleDraggable($(this).attr("rel"));
                    $(this).html(s ? 'disable dragging' : 'enable dragging');
                    if (!s)
                        $("#" + $(this).attr("rel")).addClass('drag-locked');
                    else
                        $("#" + $(this).attr("rel")).removeClass('drag-locked');
                    $("#" + $(this).attr("rel")).css("cursor", s ? "pointer" : "default");
                });
    
                $(".detach").click(function() {
                    jsPlumb.detachAllConnections($(this).attr("rel"));
                });
    
                $("#clear").click(function() {
                    jsPlumb.detachEveryConnection();
                    showConnectionInfo("");
                });
                
                _initialised = true;
            }
        }
    };

/*
    Array.prototype.uniq = function uniq() {
        return this.reduce(function(accum, cur) { 
            if (accum.indexOf(cur) === -1) accum.push(cur); 
                return accum; 
            }, [] );
    }
*/
    /***************  ON READY FUNCTION FOR JsPlump Library   *********************/

    jsPlumb.bind("ready", function() {
        //jsPlumb.reset();
        jsPlumb.setRenderMode(jsPlumb.SVG);
        jsPlumbDemo.init();

        var leftColumn = $('#leftcolumn');
        leftColumn.tinyscrollbar();

        var contentDiv = $('#content');
        contentDiv.tinyscrollbar();
/*
        if(!explorer_enabled){
            $("#refresh").append("<div id='refresh_button' class='button'>Refresh</div>");
            findSensorServices(leftColumn);
        }
        else{
            //$("#refresh").append("<div id='explorer_actuator_button' class='button'>Add Sensor or Actuator From Explorer</div>");
        }
*/
        $(window).resize(function() {
            leftColumn.tinyscrollbar_update();
            contentDiv.tinyscrollbar_update();
        });

        initGUI(leftColumn);

        //search file system and save the root directory.
        findFileSystem(leftColumn);

/*
        $('#refresh_button').live( 'click',function(event){
                findSensorServices(leftColumn);
        });
*/

        $('#explorer_actuator_button').live( 'click',function(event){
            var leftColumn = $('#leftcolumn');
            callExplorerActuator(leftColumn);
        });

        $('#clearRules').live( 'click',function(event){
            clearAll_for_rules();
        });

        $('#saveRules').live( 'click',function(event){
            save_rules(true);
        });

        $('#loadRules').live( 'click',function(event){
            load_rules();
        });

        $(document).on("click","#but_home", function(event){
            
            clearAll_for_rules();
            window.location = "index.html";
        });

        $('#close').on("click", function(event){
            var popup = $("#settings-container");
            popup.fadeOut();
        });

        $(window).on('beforeunload', function(e) {    
            clearAll_for_rules();
        }); 
    });
    

    function callExplorerActuator(container) {
        webinos.dashboard
            .open({
                    module: 'explorer',
                    data: { 
                        service: service_types,
                        multiselect: true
                    }
                  }
                , function(){ console.log("***Dashboard opened");} )
                  .onAction( function (data) {
                    for(var i in data.result){
                        if(data.result[i].api.indexOf("sensors") !== -1)
                            serviceDiscovery(container, data.result[i]); 
                        else
                            actuatorDiscovery(container, data.result[i]);
                    }
                            
                    
            });
    }

    function serviceDiscovery(container, serviceFilter){
        webinos.discovery.findServices(new ServiceType(serviceFilter.api), {
            onFound: function (service) {
                if ((service.id === serviceFilter.id) && (service.serviceAddress === serviceFilter.address) && (typeof(sensors[service.id]) === "undefined")) {
                    //found a new sensors
                    sensors[service.id] = service;
                    sensorActive[service.id] = 0;
                    service.configureSensor({rate: 500, eventFireMode: "fixedinterval"}, 
                        function(){
                            myConfigureSensor(service, true);
                        },
                        function (){
                            console.error('Error configuring Sensor ' + service.api);
                        }
                    );
                }
            }
        });
    }

    function actuatorDiscovery(container, serviceFilter){
        webinos.discovery.findServices(new ServiceType(serviceFilter.api), {
            onFound: function (service) {
                if ((service.id === serviceFilter.id) && (service.serviceAddress === serviceFilter.address) && (typeof(actuators[service.id]) === "undefined")) {
                    myConfigureActuator(service, true);
                }
            }
        });
    }