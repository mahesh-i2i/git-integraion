/**
 * Graphing question type allows to draw a point or a line (or other objects) on 
 * to an XY coordinate plane.
 */
define([
    "jquery",
    "jquery-ui/jquery-ui",
    "underscore",
    "backbone",
    "JSXGraph", 
    "text!" + _requireContextPath + "/js/templates/question/JSXGraphTpl.html",
    "text!" + _requireContextPath + "/js/templates/question/JSXGraphPreviewTpl.html" 
], function ($, jqueryui, _, Backbone, JSXGraph, JSXGraphTpl, JSXGraphPreviewTpl) {
    var _this, currentX, currentY;
    "use strict";
    var  = Backbone.View.extend({

        /**
         * Render the question considering the aspects like question type, mode of operation.
         */
        initialize: function (opts) {
            this.$el = opts.el;
            var renderTemplate = (opts.isPreview) ? JSXGraphPreviewTpl : JSXGraphTpl;
            var compiledTemplate = _.template(renderTemplate, opts.questionData);
            this.$el.html(compiledTemplate); 
            _this = this;
            this.renderDefaultParameters();            
            var question = opts.questionData.question;
            this.questionType = question.qtype ? question.qtype : opts.questionData.questionType;     
            this.isPreview = opts.isPreview;
            if(this.isPreview) {
                this.initJSXGraph("previewQuestion", question);
                var drawObjects = question.boardObjects;
                this.setDrawObjectTool(drawObjects);
                this.writeBoardObjectByLayer({
                    isFixed       : true,
                    color         : "#000000",               
                    boardElements : question.coordinates
                });
                this.defaultGraphParametersForPreview();             
            } else {
                this.initJSXGraph();               
                if (opts.questionData.isEditQuestion) {                
                    this.questionLayerBoardElements = question.coordinates;
                    this.answerLayerBoardElements   = opts.questionData.correctAnswerJson;
                    this.writeBoardObjectByLayer({
                        isFixed       : false,
                        color         : "#2B85C0",               
                        boardElements : this.questionLayerBoardElements
                    });                    
                }
                this.$(".graph-question-layer").addClass("active-layer");
                this.resizableGraph();                 
                this.command = 0; 
            } 
        },       

        events: {
            "change .plotting-graph-options" : "toggleGraphOptions",
            "keypress #unit"                 : "unitSize",
            "blur #unit"                     : "unitSizeFocusOut",
            "click #move"                    : "moveGraph",
            "click #saveQuestionDetails1"    : "saveQuestion",
            "click #resetGraph"              : "resetGraph", 
            "click #resetGraphInPreview"     : "resetGraphInPreview", 
            "click #zoomIn"                  : "zoomIn",
            "click #zoomOut"                 : "zoomOut",
            "click #cursor-type"             : "moveObject",
            "click .graph-question-layer"    : "graphQuestionLayer",
            "click .graph-answer-layer"      : "graphAnswerLayer",
            "click #delete-graph-object"     : "deleteGraphObject",
            "click .plotting-draw-icons"     : "changeDrawingElement",
            "click .jsx-graph-undo-btn"      : "jsxGraphUndo",
            "click .jsx-graph-redo-btn"      : "jsxGraphRedo"            
        },

        changeDrawingElement: function(event){
            var elementMap = {
              'point-type'   : 1,
              'line-type'    : 2,
              'segment-type' : 3 ,
              'ray-type'     : 6,
              'circle-type'  : 4,
              'vector-type'  : 0,
              'cursor-type'  : ""
            };
            this.changeCommand(elementMap[$(event.currentTarget).attr("id")]);
        },

        graphQuestionLayer: function(event){
          switch(this.questionType){
              case 160:
                  this.graphingQuestionLayerOptions();
                  break;
 			  case 161:
                    this.$("#jsx-graph-canvas").removeClass("pointer-event-none");
                    break;
          } 
          this.$(".graph-question-layer").addClass("active-layer");
          this.$(".graph-answer-layer").removeClass("active-layer"); 
        },

        graphAnswerLayer: function(event){    
          switch(this.questionType){
              case 160:
                  this.graphingAnswerLayerOptions();
                  break;
			  case 161:
                    this.emptyCommand();
                    this.$("#jsx-graph-canvas").addClass("pointer-event-none");
                    break;
          }           
          this.$(".graph-answer-layer").addClass("active-layer"); 
          this.$(".graph-question-layer").removeClass("active-layer");         
        },

        graphingQuestionLayerOptions: function(){
            this.answerLayerBoardElements = this.generateSaveCoordinatesForPreview(true);
            JXG.JSXGraph.freeBoard(this.brdyy);
            this.initJSXGraph();
            this.writeBoardObjectByLayer({
                isFixed       : false,
                color         : "#2B85C0", 
                boardElements : this.questionLayerBoardElements
            });
        },

        graphingAnswerLayerOptions: function(){
            this.questionLayerBoardElements = this.generateSaveCoordinatesForPreview(false);
            JXG.JSXGraph.freeBoard(this.brdyy);
            this.initJSXGraph();
            this.writeBoardObjectByLayer({
                isFixed       : true,
                color         : "#000000",               
                boardElements : this.questionLayerBoardElements               
            });   
            this.writeBoardObjectByLayer({
                isFixed       : false,
                color         : "#2B85C0",               
                boardElements : this.answerLayerBoardElements
            });
        },

        writeBoardObjectByLayer: function(options){
            this.isFixed              = options.isFixed;  
            this.userStrokeColor      = options.color;
            this.userColor            = options.color; 
            this.color                = options.color;
            this.highlightStrokeColor = options.color;   
            this.drawObjects(options.boardElements, false, this.isPreview);
        },

        defaultGraphParametersForPreview:  function(options){
            this.isFixed              = false;  
            this.userStrokeColor      = "#2B85C0";
            this.userColor            = "#2B85C0"; 
            this.color                = "#2B85C0";
            this.highlightStrokeColor = "#2B85C0";
        },

        resizableGraph: function () {
            var self = this;
            this.$("#resizable-graph").resizable({
                maxHeight : 600,
                maxWidth  : 750,
                minHeight : 100,
                minWidth  : 100,
                alsoResize: ".jsx-graph-bottom",
                aspectRatio: true,
                resize: function (event, ui) {
                    var h = self.$("#resizable-graph").height() - 25;
                    var w = self.$("#resizable-graph").width();
                    if (w >= 575) {
                        self.$(".plotting-graph").width(w);
                    }
                    self.resizeJSXGraph(w, h);
                }
            });
        },

        setDrawObjectTool: function (drawObjects) {
            var drawTools = [drawObjects.pointType, drawObjects.lineType, drawObjects.segmentType, drawObjects.rayType, drawObjects.circleType, drawObjects.vectorType];
            var checkTool = 0;
            for (var i in drawTools) {
                if (drawTools[i]) {
                    checkTool = i;
                    break;
                }
            }
            switch (parseInt(checkTool)) {
               case 0: this.changeCommand(1); break;
               case 1: this.changeCommand(2); break;
               case 2: this.changeCommand(3); break;
               case 3: this.changeCommand(6); break;
               case 4: this.changeCommand(4); break;
               case 5: this.changeCommand(0); break;
            }            
            this.isShowAxisLabels();
        },

        unitSizeFocusOut: function (ev) {
            this.unitSizeJSXGraph();
        },

        resetGraph: function () {
            document.getElementById("unit").value = 10;
            document.getElementById("gridSize").value = 50;
            this.gridSize = 1;
            this.currentPointsArray = [];
            JXG.JSXGraph.freeBoard(this.brdyy);
            this.initJSXGraph();
            //To check with plotting draw options
            var allPlottingOptions = this.$("#allPlottingOptions").is(":checked");
            if(allPlottingOptions) {
                $("#"+elementIds[0]).trigger("click");
            } else if(allPlottingOptions === false) {
                 this.changeDrawingObjectType();
            }
        },

        resetGraphInPreview: function () {   
            JXG.JSXGraph.freeBoard(this.brdyy);      
            this.currentPointsArray = [];
            var resetQuestion = eval("(" + $("#jsonData").val() + ")");
            this.initJSXGraph("previewQuestion", resetQuestion);
            var drawObjects = resetQuestion.boardObjects;
            this.setDrawObjectTool(drawObjects);
            this.writeBoardObjectByLayer({
                isFixed       : true,
                color         : "#000000",               
                boardElements : resetQuestion.coordinates
            });
            this.defaultGraphParametersForPreview();
        },

        unitSize: function (ev) {
            if (ev.which != 13 && ev.which != 9 && ev.which != 8 && ev.which !== 0 && (ev.which < 48 || ev.which > 57)) {
                return false;
            }
            if (ev.keyCode == 9 || ev.keyCode == 13) {
                this.unitSizeJSXGraph();
                return false;
            }
            this.showMessage("You have unsaved changes.","warning");
        },

        moveGraph: function (ev) {
            this.moveOrigin();
        },

        moveObject: function (ev) {
            this.command = "";
        },

        zoomIn: function () {            
            this.zoomingIn();            
            this.showMessage("You have unsaved changes.","warning");
        },
        
        zoomOut: function () {         
            this.zoomingOut();
            this.showMessage("You have unsaved changes.","warning");
        },

        toggleGraphOptions: function (ev) {
            var plottingOptionType = $(ev.currentTarget).attr("name");
            var isChecked = $(ev.currentTarget).is(":checked");
            var allPlottingOptions = this.$("#allPlottingOptions").is(":checked");
            if(plottingOptionType == "allPlottingOptions"){
                if (isChecked) {
                    this.enableAllDrawObject();
                   } else {
                    this.disableAllDrawObject();
                   }
            } else {
                if (isChecked){
                       this.enableSelectedDrawObjects(plottingOptionType);
                    }
                    else{
                       this.disableSelectedDrawObjects(plottingOptionType);
                    }
            }
            this.showMessage("You have unsaved changes.","warning");
        },

       disableAllDrawObject: function () {
           for(i=0;i<=5;i++){
               this.$("#"+this.elementType[i]).removeAttr("checked");
               this.$("#"+this.elementIds[i]).css({"background": "#D8D8D8"});
               this.$("#"+this.elementIds[i]).attr("onclick", "");
           }
           this.$("#cursor-type").trigger("click");
       },

       enableAllDrawObject: function () {
           for(i=0;i<=5;i++){
               this.$("#"+this.elementType[i]).prop("checked", true);
               this.$("#"+this.elementIds[i]).css({"background": "#FFFFFF"});
               //this.$("#"+this.elementIds[i]).attr("onclick", "this.changeCommand("+this.changeCommandValue[i]+")");
           }
           this.$("#"+this.elementIds[0]).trigger("click");
       },

       enableSelectedDrawObjects: function (plottingOptionType) {
           this.$("#allPlottingOptions").attr("checked", false);
           for(i=0;i<=5;i++){
               if(this.elementType[i].indexOf(plottingOptionType) === 0){
                    //this.$("#"+this.elementIds[i]).attr("onclick", "this.changeCommand("+this.changeCommandValue[i]+")");
                    this.$("#"+this.elementIds[i]).css({"background": "#FFFFFF"});
                    this.command = this.changeCommandValue[i];
                    this.$("#"+this.elementIds[i]).trigger("click");
               }
           }
       },

       disableSelectedDrawObjects: function (plottingOptionType) {
           this.$("#allPlottingOptions").attr("checked", false);
           for(i=0;i<=5;i++) {
               if(this.elementType[i].indexOf(plottingOptionType) === 0){
                   this.$("#"+this.elementIds[i]).attr("onclick", "");
                   this.$("#"+this.elementIds[i]).css({"background": "#D8D8D8"});
               }
           }
           this.changeDrawingObjectType();
       },

       /*
        * Here we reset the drawing object, which is enabled first.
        */
       changeDrawingObjectType : function() {
            var allDisabled = true;
            var enabledDrawingObjectId;
            for(i=0;i<=5;i++) {
                var enabledDrawingObjectType = this.$("#"+this.elementIds[i]).attr("onclick");
                if(enabledDrawingObjectType !== "") {
                    AllDisabled = false;
                    enabledDrawingObjectId = i;
                    break;
                }
            }
            if(allDisabled)
                this.$("#cursor-type").trigger("click");
            else
                this.$("#"+this.elementIds[enabledDrawingObjectId]).trigger("click");
       },

       showDrawObjectsInEditMode: function (drawObjects) {
           var drawObjects = [drawObjects.pointType,drawObjects.lineType,drawObjects.segmentType,drawObjects.rayType,drawObjects.circleType,drawObjects.vectorType];
           this.$("#allPlottingOptions").attr("checked", false);
               for(var i=0;i<=5;i++){
                   this.$("#"+this.elementIds[i]).css({"background": "#D8D8D8"});
                   if(drawObjects[i]){
                        this.$("#"+this.elementType[i]).attr("checked", true);                       
                        this.$("#"+this.elementIds[i]).css({"background": "#FFFFFF"});
                        this.command = this.changeCommandValue[i];
                    }
               }
       },
       
       /**
        * Construct user response as map
        */
       getGraphCoordinatesForPreview: function(){            
           return this.generateSaveCoordinatesForPreview(true);
       },

       emptyCommand: function(){
          this.changeCommand("");  
       },

       drawObjectInGraph: function(questionData){
          this.initGraph("previewQuestion", questionData);
          var drawObjects = questionData.boardObjects;
          this.setDrawObjectTool(drawObjects);
       },      

       applyColorToObject: function(userResponses){
          this.checkCorrectObjects(userResponses);
       },

       isShowGrid: function(isShowGrid){
          var strokeWidth = (isShowGrid) ? 1 : 0;
          this.xaxis.defaultTicks.strokeWidth(strokeWidth);
          this.yaxis.defaultTicks.strokeWidth(strokeWidth);
      },       

        deleteGraphObject: function(event){  
            $(event.currentTarget).toggleClass("box-inset-blue-shadow");  
            this.isDeleteJSXGraphObject = this.isDeleteJSXGraphObject ? false : true;  
            this.command = "";
        },

       /**
         * Show message on footer based type of message.
         * Figure out a way to use BaseQuestionView's method
         */
        showMessage: function (msg, type) {
            var msgContent = "";
            if (type == "warning") {
                msgContent = "<label style='color:orange;'>" + msg + "</label>";
            } else if (type == "success") {
                msgContent = "<label style='color:green;'>" + msg + "</label>";
            } else if (type == "error") {
                msgContent = "<label style='color:red;'>" + msg + "</label>";
            } else if (type == "info") {
                msgContent = "<label style='color:#515151;'>" + msg + "</label>";
            }
            $("#footer-notification-text").html(msgContent);
        }, 

        renderDefaultParameters: function(){
            this.brdyy;
            this.code;
            this.codeObjects;
            // Current command
            this.command;
            // Commands
            this._ERASE_ = -1,  this._ARROW_ = 0,  this._CHANGE_ATTR_ = -2,  this._PENCIL_ = -3,  this._POINT_ = 1,  this._LINE_ = 2,  this._SEGMENT_ = 3,  this._CIRCLE_ = 4,  this._POLYGON_ = 5,  this._HLINE_ = 6,  this._CIRCLE3_ = 7,  this._CIRCLER_ = 8,  this._TEXT_ = 51,  this._SLIDER_ = 52,  this._INTERSECTION_ = 101,  this._ANGLE_BISECTOR_ = 102,  this._MIDPOINT_ = 103,  this._PERPENDICULAR_ = 104,  this._PARALLEL_ = 105,  this._SYMMETRY_ = 150;
            // scale of construnction # DEFAULT = 10
            this.scale = 10;
            // Current construction points and new points, added by user acitity
            this.ccPoints, this.newPointsyy;
            // Object which contains current object, changing on mousemove
            this.animation;
            // Current coordinations of mouse pointer, changing on mousemove
            this.currentX, this.currentY;
            // Current point, changing on mousemove
            this.currentPoint;
            // Selected objects
            this.selectedObjects;
            // sliders
            this.sliders;

            this.pencilPointsArray;

            this.poppedPointsArray = new Array();

            this.currentPointsArray = new Array();

            this.color = "#2B85C0", this.highlightStrokeColor = "#2B85C0", this.userColor = "#2B85C0", this.userStrokeColor = "#2B85C0", this.userStrokeWidth = 2, this.userSize = 3, this.userfillOpacity = 1, this.checkAnswer = false, this.isFixed = false, this.isDeleteJSXGraphObject = false;

            this.unit = 10, this.move = false, this.yaxis, this.xaxis, this.unit, this.draggableIcon;

            this.divObject, this.boardWidth, this.boardHeight, this.gridSize = 1, this.grid, this.getQuestionObjects, this.gridPxSize, this.isEmptyRedo = true;

            this.gridPxList = [10,20,30,40,50,60,70,80,90,100,110];

            this.elementIds = ['point-type','line-type','segment-type','ray-type','circle-type','vector-type'];
            this.elementType = ['pointType','lineType','segmentType','rayType','circleType','vectorType'];
            this.changeCommandValue = [1,2,3,6,4,0];

            this.boardElements = [];

            this.urlImg = "./images/icon-draggable.png";
        },

        resizeJSXGraph: function(w, h) {
            var resize = this.brdyy.resizeContainer(w, h, 0);
            resize.fullUpdate();
            this.isShowAxisLabels();
        },

        moveOrigin: function() {      
            this.brdyy.initMoveOrigin();
        },

        zoomingIn: function() {
            if(this.gridSize >= -3 && this.gridSize < 7){
                this.getScrCoords();
                this.brdyy.zoomIn();
                this.gridSize = this.gridSize + 1;
                this.gridPxSize = this.checkGridSize(gridSize);
                document.getElementById("gridSize").value = this.gridPxSize;
                this.brdyy.moveOrigin(this.xCoords, this.yCoords);       
                this.isShowAxisLabels();
            }
        },

        zoomingOut: function() {
            if(this.gridSize > -3 && this.gridSize <= 8){
                this.getScrCoords();
                this.brdyy.zoomOut();
                this.gridSize = this.gridSize - 1;
                this.gridPxSize = this.checkGridSize(this.gridSize);
                document.getElementById("gridSize").value = this.gridPxSize;
                this.brdyy.moveOrigin(this.xCoords, this.yCoords);      
                this.isShowAxisLabels();
           }
        },

        checkGridSize: function(gridSize){
            switch(gridSize) {
                case -3: return this.gridPxList[0]; break;
                case -2: return this.gridPxList[1]; break;
                case -1: return this.gridPxList[2]; break;
                case 0: return this.gridPxList[3]; break;
                case 1: return this.gridPxList[4]; break;
                case 2: return this.gridPxList[5]; break;
                case 3: return this.gridPxList[6]; break;
                case 4: return this.gridPxList[7]; break;
                case 5: return this.gridPxList[8]; break;
                case 6: return this.gridPxList[9]; break;
                case 7: return this.gridPxList[10]; break;
            }
        },

        getScrCoords: function(){
            this.xCoords = this.brdyy.origin.scrCoords[1];
            this.yCoords = this.brdyy.origin.scrCoords[2];
        },

        setBoundingBoxValue: function() {
            this.unit = document.getElementById("unit").value;
            this.gridPxSize = this.checkGridSize(this.gridSize);
            document.getElementById("gridSize").value = this.gridPxSize;
            if(this.unit <= 0){
                document.getElementById("unit").value = 10;
                this.unit = 10;
            }
            var setGrid = this.unit * 5;
            this.grid = [-setGrid, setGrid, setGrid, -setGrid];
        },

        unitSizeJSXGraph: function() {
            if (this.unit != document.getElementById("unit").value){
                this.unit = document.getElementById("unit").value;
                if(this.unit <= 0){
                    document.getElementById("unit").value = 10;
                    this.unit = 10;
                }
                var setGrid = this.unit * 5;
                grid = [-this.setGrid, this.setGrid, this.setGrid, -this.setGrid];
                JXG.JSXGraph.freeBoard(this.brdyy);
                this.initJSXGraph(false,false);
                this.brdyy.fullUpdate();
                this.isShowAxisLabels();
                this.isDeleteJSXGraphObject = false;
                this.$("#delete-graph-object").removeClass("box-inset-blue-shadow"); 
            }
        },

        setgridProperty: function(){
            var n = this.gridSize;
                this.gridSize = 1;
                if(n > 1){
                   for(var i=1;i<n;i++){
                       this.zoomingIn();
                      }
                } else {
                    for(var i=n;i<1;i++)
                        this.zoomingOut();
                }
        },

        editGridSizeJSXGraph: function() {
            this.brdyy.setBoundingBox(this.getQuestionObjects.boardObjects.grid);
            this.brdyy.moveOrigin(this.getQuestionObjects.boardObjects.xCoords, this.getQuestionObjects.boardObjects.yCoords);
        },

        editBboxValue: function() {
            this.unit = this.getQuestionObjects.boardObjects.ticksDistance;
            document.getElementById("unit").value = this.unit;
            this.gridSize = this.getQuestionObjects.boardObjects.gridSize;
            this.setBoundingBoxValue();
        },

        drawObjects: function(boardElementObj, isUndoAndRedo) {
            if(this.currentPointsArray.length > 0 && this.isEmptyRedo){
                var currentPointsArrayLength = true;
                this.currentPointsArray = new Array();
            }
            var isShortline = true, checkObject = true;
            for(var i in boardElementObj) {
                var objectValues = boardElementObj[i];
                if (objectValues.type != 'point'){
                    if (objectValues.type === 'strightline' || objectValues.type === 'shortline') {
                        checkObject = false;
                        if(objectValues.type === 'shortline'){
                            isShortline = false;
                        } else {
                            isShortline = true;
                        }
                    }
                    var isVisibleAyy = this.isVisibleCheck(objectValues.isVisiblePoint1);
                    var Ayy = this.brdyy.create('point', objectValues.pointSet1, {name:objectValues.pointSetName1, fixed:this.isFixed, snapSizeX: this.unit, snapSizeY:this.unit,snapToGrid : true, highlightStrokeColor:'#2B85C0', fillColor:'#2B85C0', strokeColor:'#2B85C0', strokeWidth:2, size:3, fillOpacity:1});
                    Ayy.setPosition(JXG.COORDS_BY_USER, objectValues.pointSet1);
                    Ayy.setAttribute({fillColor:this.userColor, strokeColor:this.userStrokeColor, strokeWidth:2, fillOpacity:1, visible:isVisibleAyy});
                    Ayy.isVisible = (objectValues.isVisiblePoint1 || objectValues.isVisiblePoint1 == undefined) ? true : false;
                    var isVisibleByy = this.isVisibleCheck(objectValues.isVisiblePoint2);
                    var Byy = this.brdyy.create('point', objectValues.pointSet2, {name:objectValues.pointSetName2, fixed:this.isFixed, snapSizeX: this.unit, snapSizeY:unit,snapToGrid : true, highlightStrokeColor:'#2B85C0', fillColor:'#2B85C0', strokeColor:'#2B85C0', strokeWidth:2, size:3, fillOpacity:1});
                    Byy.setPosition(JXG.COORDS_BY_USER, objectValues.pointSet2);
                    Byy.setAttribute({fillColor:this.userColor, strokeColor:this.userStrokeColor, strokeWidth:2, fillOpacity:1, visible:isVisibleByy});
                    Byy.isVisible = (objectValues.isVisiblePoint2 || objectValues.isVisiblePoint2 == undefined) ? true : false;
                    var kbyy = this.brdyy.create(checkObject ? objectValues.type : 'line', [Ayy, Byy], {straightFirst:isShortline, highlightStrokeColor:'#2B85C0', fixed:true, fillColor:'#2B85C0', strokeColor:'#2B85C0', strokeWidth:2, size:3, fillOpacity:0});
                    kbyy.setAttribute({fillColor:this.userColor, strokeColor:this.userStrokeColor, strokeWidth:2, fillOpacity:0});
                    if(isUndoAndRedo || currentPointsArrayLength){
                          var usrCoordinates = {
                                  pointSet1: boardElementObj[i].pointSet1,
                                  pointSet2: boardElementObj[i].pointSet2,
                                  type: boardElementObj[i].type,
                                  checkCorrectAns: false,
                                  radius: boardElementObj[i].radius
                              };
                          this.currentPointsArray.push({type:boardElementObj[i].type, points:[Ayy,Byy], usrCoordinates:usrCoordinates});
                    }
                    if(!this.isFixed){
                        this.addMouseUpListeners(Ayy);
                        this.addMouseUpListeners(Byy); 
                    }            
                } else {
                    var isVisibleAyy = this.isVisibleCheck(objectValues.isVisible);
                    var Ayy = this.brdyy.create(objectValues.type, [objectValues.xCoords, objectValues.yCoords], {name:objectValues.labelName, fixed:this.isFixed, snapSizeX: this.unit, snapSizeY:this.unit, snapToGrid:true, fillColor:'#2B85C0', strokeColor:'#2B85C0', strokeWidth:2, size:3, fillOpacity:1});
                    Ayy.setPosition(JXG.COORDS_BY_USER, [objectValues.xCoords, objectValues.yCoords]);
                    Ayy.setAttribute({fillColor:this.userColor, strokeColor:this.userStrokeColor, strokeWidth:2, fillOpacity:1, visible:isVisibleAyy}); 
                    Ayy.isVisible = (objectValues.isVisible || objectValues.isVisible == undefined) ? true : false;         
                    if(isUndoAndRedo || currentPointsArrayLength){
                          var usrCoordinates = {
                              xCoords: objectValues.xCoords,
                              yCoords: objectValues.yCoords,
                              type: boardElementObj[i].type,
                              checkCorrectAns: false,
                              radius: 0
                          };
                          this.currentPointsArray.push({type:boardElementObj[i].type, points:[Ayy], usrCoordinates:usrCoordinates});
                    }
                    if(!this.isFixed){
                        this.addMouseUpListeners(Ayy);
                    }  
                }
                checkObject = true;
                this.brdyy.fullUpdate();
                this.isShowAxisLabels();
            }
        },

        isVisibleCheck: function(isVisible){
            if(this.isPreview){
                return (isVisible || isVisible == undefined) ? true : false;        
            } else {
                return true;
            }
        },

        addMouseUpListeners: function(pointObj){
            var self = this;

            JXG.addEvent(pointObj.rendNode, 'mouseup', function(event){                
                if(self.isDeleteJSXGraphObject) { 
                    self.removeJSXGraphObject.call(this, self);
                }else{
                    if(self.command == "" && !self.isPreview)
                        self.renderDialog.call(this);
                }        
            }, pointObj);
            $('html, body').off('mousedown.jsx-graph-edit-dialog touchend.jsx-graph-edit-dialog').on('mousedown.jsx-graph-edit-dialog touchstart.jsx-graph-edit-dialog', function(e) {
                var tooltipContainer = $('.jsx-graph-edit-dialog');
                if (tooltipContainer.length > 0) {
                    if (!($(e.target).closest('.jsx-graph-edit-dialog').length > 0)) {
                        $('.jsx-graph-edit-dialog').remove();
                    }
                }
            });
        },

        removeJSXGraphObject: function(self){            
            if(_.size(this.childElements) > 1){
                $.map( this.childElements, $.proxy(function( val, i ) {
                    if(val.elType !== "text"){
                        if(val.elType === "circle"){
                            this.brdyy.removeObject(val.center);
                        }else{
                            this.brdyy.removeObject(val.point1);
                        }                
                        this.brdyy.removeObject(val.point2);
                        this.brdyy.removeObject(val);                    
                    }                  
                },self)); 
            }else{        
                self.brdyy.removeObject(this);
            }
        },

        renderDialog: function(){     
            if ($('.jsx-graph-edit-dialog').length > 0) {
                $('.jsx-graph-edit-dialog').remove();
            }   
            $("body").append(
                $("<div>",{
                "class" : "jsx-graph-edit-dialog",
                "style" : "left:"+(event.pageX - 96)+"px;top:"+(event.pageY - 135)+"px;"                    
                }).append(
                    $("<div>").append(
                        $("<span>", {
                            "text" : "Point"
                        }).add(
                             $("<input>", {
                                "type"     : "text",
                                "class"    : "jsx-graph-lable-text",
                                "value"    : this.label.plaintext,
                                "keyup"    : $.proxy(function(event){                                       
                                    this.label.setText($(event.currentTarget).val());           
                                }, this)
                            })
                        )
                    ).add(
                        $("<div>",{
                            "class" : "is-show-label-con"
                        }).append(                   
                            $("<input>", {
                                "type"     : "checkbox",
                                "class"    : "jsx-graph-is-show-lable-checkbox",
                                "checked"  : this.label.getAttribute("visible"),
                                "click"    : $.proxy(function(event){                                       
                                    this.label.visible($(event.currentTarget).is(":checked"));           
                                }, this)
                            }).add(
                                $("<span>", {
                                    "text"  : "Show Label",
                                    "class" : "jsx-graph-is-show-lable"
                                })
                            )
                        )
                    ).add(
                        $("<div>",{
                            "class" : "is-show-object-con"
                        }).append(                   
                            $("<input>", {
                                "type"     : "checkbox",
                                "class"    : "jsx-graph-is-show-object-checkbox",
                                "checked"  : (this.isVisible || this.isVisible == undefined) ? true : false,
                                "click"    : $.proxy(function(event){      
                                    this.isVisible = $(event.currentTarget).is(":checked");
                                }, this)
                            }).add(
                                $("<span>", {
                                    "text"  : "Show Object",
                                    "class" : "jsx-graph-is-object-lable"
                                })
                            )
                        )
                    )          
                )
            )
        },

        checkCorrectObjects: function(userResponse) {
            var isShortline = true, colorCode, checkObject = true, checkAnswer = true;
            for(var i in userResponse) {
                var objectValues = userResponse[i];
                if(objectValues.checkCorrectAns == true){
                    colorCode = '#1E9301';
                } else {
                    colorCode = '#FF0400'
                }
                if (objectValues.type != 'point'){
                if (objectValues.type === 'strightline' || objectValues.type === 'shortline') {
                    checkObject = false;
                    if(objectValues.type === 'shortline'){
                        isShortline = false;
                    } else {
                        isShortline = true;
                    }
                }
                
                var Ayy = this.brdyy.create('point', objectValues.pointSet1, {snapSizeX: this.unit, snapSizeY:this.unit,snapToGrid : true, highlightStrokeColor:colorCode, fillColor:colorCode, strokeColor:colorCode, strokeWidth:2, size:3, fillOpacity:1});
                Ayy.setPosition(JXG.COORDS_BY_USER, objectValues.pointSet1);
                Ayy.setAttribute({fillColor:colorCode, strokeColor:colorCode, size: 5, strokeWidth:21, fillOpacity:1, strokeOpacity:0.20});
                var Byy = this.brdyy.create('point', objectValues.pointSet2, {snapSizeX: this.unit, snapSizeY:this.unit,snapToGrid : true, highlightStrokeColor:colorCode, fillColor:colorCode, strokeColor:colorCode, strokeWidth:2, size:3, fillOpacity:1});
                Byy.setPosition(JXG.COORDS_BY_USER, objectValues.pointSet2);
                Byy.setAttribute({fillColor:colorCode, strokeColor:colorCode, size: 5, strokeWidth:21, fillOpacity:1, strokeOpacity:0.20});
                var kbyy = this.brdyy.create(checkObject ? objectValues.type : 'line' , [Ayy, Byy], {straightFirst:isShortline, highlightStrokeColor:colorCode, fixed:true, fillColor:colorCode, strokeColor:colorCode, strokeWidth:2, size:3, fillOpacity:0});
                kbyy.setAttribute({fillColor:colorCode, strokeColor:colorCode, strokeWidth:2, fillOpacity:0});
                       var usrCoordinates = {
                               pointSet1       : userResponse[i].pointSet1,
                               pointSet2       : userResponse[i].pointSet2,
                               type            : userResponse[i].type,
                               checkCorrectAns : false,
                               radius          : userResponse[i].radius
                           };
                       this.currentPointsArray.push({type:userResponse[i].type, points:[Ayy,Byy], usrCoordinates:usrCoordinates});
                } else {
                    var Ayy = this.brdyy.create(objectValues.type, [objectValues.xCoords, objectValues.yCoords], {snapSizeX: this.unit, snapSizeY:this.unit, snapToGrid:true, fillColor:colorCode, strokeColor:colorCode, strokeWidth:2, size:3, fillOpacity:1});
                    Ayy.setPosition(JXG.COORDS_BY_USER, [objectValues.xCoords, objectValues.yCoords]);
                    Ayy.setAttribute({fillColor:colorCode, strokeColor:colorCode, size: 5, strokeWidth:21,fillOpacity:1, strokeOpacity:0.20});
                        var usrCoordinates = {
                            xCoords         : objectValues.xCoords,
                            yCoords         : objectValues.yCoords,
                            type            : userResponse[i].type,
                            checkCorrectAns : false,
                            radius          : 0
                        };
                        this.currentPointsArray.push({type:userResponse[i].type, points:[Ayy], usrCoordinates:usrCoordinates});
                }
                checkObject = true;
                this.brdyy.fullUpdate();
                this.isShowAxisLabels();
            }
        },

        initJSXGraph: function(isEditQuestion, question) {
            if(isEditQuestion) {
                this.isEmptyRedo = true;
                this.boardElements = [];
                this.getQuestionObjects = question;
                this.editBboxValue();
            } else {
                this.setBoundingBoxValue();
            }

            this.brdyy = JXG.JSXGraph.initBoard("jsx-graph-canvas", {
                axis    : false,
                borders : false,
                /* special arc options */
                arc : {
                    firstArrow           : false,
                    lastArrow            : false,
                    fillColor            : 'none',
                    highlightFillColor   : 'none',
                    strokeColor          : '#0000ff',
                    useDirection         : true
                },
                boundingbox     : this.grid,
                showNavigation  : false,
                showCopyright   : false,
                keepaspectratio : true,
                grid            : false
            });
            this.yaxis = this.brdyy.create('axis', [[0, 0], [0, 1]], {
                ticks : {
                    insertTicks   : false,
                    drawZero      : false,
                    ticksDistance : this.unit,
                    minorticks    : 0,
                    label : {
                        offset : [-20, -0]
                    }
                }
            });
            this.xaxis = this.brdyy.create('axis', [[0, 0], [1, 0]], {
                ticks : {
                    insertTicks   : false,
                    drawZero      : true,
                    ticksDistance : this.unit,
                    minorticks    : 0,
                    label : {
                        offset : [-10, -10]
                    }
                }
            });
            if(isEditQuestion){
                //editGridSizeJSXGraph();
                if(isEditQuestion != 'previewQuestion'){
                    this.drawObjects(this.getQuestionObjects.coordinates, false);
                    this.isEmptyRedo = false;
                }
                this.brdyy.moveOrigin(this.getQuestionObjects.boardObjects.xCoords, this.getQuestionObjects.boardObjects.yCoords);
            }
            this.setgridProperty();
            this.command           = "";
            this.registerEvents();
            this.command           = 1;
            this.codeObjects       = new Array();
            this.sliders           = new Array();
            this.pencilPointsArray = null;
            this.code              = "";
            this.ccPoints          = new Array();
            this.newPoints         = new Array();
        },

        generateBoardObjects: function() {
            var boardWidth     = document.getElementById('jsx-graph-canvas').style.width;
            var boardHeight    = document.getElementById('jsx-graph-canvas').style.height;
            var outerDivHeight = document.getElementById('resizable-graph').style.height;
            var emableAllGraphPoints = document.getElementById('allPlottingOptions').checked;
            if (emableAllGraphPoints === true) {
                var pointType = true, lineType = true, segmentType = true, rayType = true, vectorType = true, circleType = true;
            } else {
                var pointType   = document.getElementById('pointType').checked;
                var lineType    = document.getElementById('lineType').checked;
                var segmentType = document.getElementById('segmentType').checked;
                var rayType     = document.getElementById('rayType').checked;
                var vectorType  = document.getElementById('vectorType').checked;
                var circleType  = document.getElementById('circleType').checked;
            }
            this.getScrCoords();
            this.xCoords = this.brdyy.origin.scrCoords[1];
            this.yCoords = this.brdyy.origin.scrCoords[2];
            var boardObjects = {
                boardWidth           : boardWidth,
                boardHeight          : boardHeight,
                outerDivHeight       : outerDivHeight,
                grid                 : this.grid,
                gridSize             : this.gridSize,
                ticksDistance        : this.unit,
                xCoords              : this.xCoords,
                yCoords              : this.yCoords,
                emableAllGraphPoints : emableAllGraphPoints,
                pointType            : pointType,
                lineType             : lineType,
                segmentType          : segmentType,
                rayType              : rayType,
                vectorType           : vectorType,
                circleType           : circleType
            }
        return boardObjects;
        },

        jsxGraphRedo: function(){
            if(this.poppedPointsArray.length>0){
              var data = this.poppedPointsArray.pop();
              var usrCoordinates = [data.usrCoordinates];
              if (this.checkAnswer) {
                  this.checkCorrectObjects(usrCoordinates);
              } else {
                  this.isEmptyRedo = false;
                  this.drawObjects(usrCoordinates, true);
              }
            }
        },

        jsxGraphUndo: function(){
            if(this.currentPointsArray.length>0){
              var data = this.currentPointsArray.pop();
              this.poppedPointsArray.push(data);
              this.brdyy.removeObject(data.points[0]);
              this.brdyy.removeObject(data.points[1]);
              this.brdyy.fullUpdate();
              this.isShowAxisLabels();
            }
        },

        

        generateSaveCoordinatesForPreview: function(isAnswerLayer) {
            isAnswerLayer = isAnswerLayer ? isAnswerLayer : false;
            var i = 0;
            var xPoint = [], yPoint = [], getPoint = 0, isVisiblePoint1 = "", isVisiblePoint2 = "", pointSetName1 = "", pointSetName2 = "", pointSet1 = [], pointSet2 = [], objId = [], radius, slopeEquation;
            //Remove or Empty Previous Boardelement Object
            this.boardElements = [];
            for (var el in this.brdyy.objects) {
                var obj = this.brdyy.objects[el];
                if(obj.radius > 0){
                    radius = obj.radius;
                } else {
                    radius = 0;
                }
                if (obj.elType != '' && obj.elType == 'text') {
                    var size = obj.getAttribute('fontSize');
                    var color = obj.getAttribute('color');
                    var bnd = obj.bounds();
                } else if(obj.elType != '') {
                    var isSinglePoint = obj.getAttribute('isSinglePoint');
                    var isPoint = obj.getAttribute('elType');            
                    // Generate Point Coordinates
                    if (Object.keys(obj.childElements).length == 1 && obj.elType == 'point') {
                        if((obj.coords.usrCoords[1] > 1 || obj.coords.usrCoords[1] < 0) && (obj.coords.usrCoords[2] > 1 || obj.coords.usrCoords[2] < 0)){
                            if(isNaN(obj.X())){obj.X() = 0;}
                            if(isNaN(obj.Y())){obj.Y() = 0;}
                            obj.elType = {
                                xCoords         : obj.X(),
                                yCoords         : obj.Y(),
                                type            : obj.elType,
                                checkCorrectAns : false,
                                labelName       : (typeof obj.label == "object") ? obj.label.plaintext : "",
                                isVisible       : (obj.isVisible || obj.isVisible == undefined) ? true : false
                            };
                            if(isAnswerLayer){
                                if(obj.getAttribute("strokeColor") !== "#000000")
                                    this.boardElements.push(obj.elType);
                            }else{
                                this.boardElements.push(obj.elType);
                            }
                        }
                    } else {
                        xPoint[getPoint] = obj.X();
                        yPoint[getPoint] = obj.Y(); 
                        if(typeof obj.label == "object"){
                            if(pointSetName1){
                                pointSetName2 = (typeof obj.label == "object") ? obj.label.plaintext : "";
                            }else{
                                pointSetName1 = (typeof obj.label == "object") ? obj.label.plaintext : "";
                            }
                        }
                        if(obj.elType == "point"){  
                            if(isVisiblePoint1){
                                isVisiblePoint2 = (obj.isVisible || obj.isVisible == undefined) ? "true" : "false";
                            }else{
                                isVisiblePoint1 = (obj.isVisible || obj.isVisible == undefined) ? "true" : "false";
                            }
                        }
                        if(isNaN(xPoint[0])){xPoint[0] = 0;}
                        if(isNaN(xPoint[1])){xPoint[1] = 0;}
                        if(isNaN(yPoint[1])){yPoint[1] = 0;}
                        if(isNaN(yPoint[0])){yPoint[0] = 0;}
                        objId[getPoint] = obj.id;
                        getPoint++;
                        if (getPoint == 2 && obj.elType != 'point') {
                            if (objId[0] == obj.parents[1]) {
                                xPoint[1] = xPoint[0];
                                yPoint[1] = yPoint[0];
                                xPoint[0] = 0;
                                yPoint[0] = 0;
                            } else {
                                xPoint[1] = 0;
                                yPoint[1] = 0;
                            }
                            getPoint = 0;
                            obj.elType = {
                                pointSet1       : [xPoint[0], yPoint[0]],
                                pointSetName1   : pointSetName1,
                                pointSetName2   : pointSetName2,
                                isVisiblePoint1 : eval(isVisiblePoint1),
                                isVisiblePoint2 : eval(isVisiblePoint2),
                                pointSet2       : [xPoint[1], yPoint[1]],                          
                                type            : obj.elType,
                                checkCorrectAns : false
                            };
                            pointSetName1 = "", pointSetName2 = "", isVisiblePoint1 = "", isVisiblePoint2 = "";      
                        }
                        if (getPoint > 2) {
                            getPoint = 0;
                            obj.elType = {
                                pointSet1       : [xPoint[0], yPoint[0]],
                                pointSet2       : [xPoint[1], yPoint[1]],
                                pointSetName1   : pointSetName1,
                                pointSetName2   : pointSetName2,
                                isVisiblePoint1 : eval(isVisiblePoint1),
                                isVisiblePoint2 : eval(isVisiblePoint2),
                                type            : obj.elType,
                                checkCorrectAns : false
                            };  
                            pointSetName1 = "", pointSetName2 = "", isVisiblePoint1 = "", isVisiblePoint2 = "";                 
                        }
                        // Generate Short Lines Coordinates
                        if (obj.elType.type === 'line') {
                            slopeEquation = this.generateLineSlopeEquation(xPoint[0],yPoint[0],xPoint[1], yPoint[1]);
                            if (obj.getAttribute('straightFirst') == false) {
                                obj.elType = {
                                    pointSet1       : [xPoint[0], yPoint[0]],
                                    pointSet2       : [xPoint[1], yPoint[1]],
                                    pointSetName1   : obj.elType.pointSetName1,
                                    pointSetName2   : obj.elType.pointSetName2,
                                    isVisiblePoint1 : eval(obj.elType.isVisiblePoint1),
                                    isVisiblePoint2 : eval(obj.elType.isVisiblePoint2),
                                    type            : 'shortline',
                                    checkCorrectAns : false,
                                    slope           : slopeEquation[0],
                                    lineEquation    : slopeEquation[1]
                                }
                                if(slopeEquation[2]){
                                    obj.elType["verticalLine"] = slopeEquation[2];
                                }
                                if(yPoint[0] > yPoint[1]) {
                                    obj.elType["lineDirection"] = 'down';
                                } else if (yPoint[0] < yPoint[1]) {
                                    obj.elType["lineDirection"] = 'top';
                                }
                                if(isAnswerLayer){
                                    if(obj.getAttribute("strokeColor") !== "#000000")
                                        this.boardElements.push(obj.elType);
                                }else{
                                    this.boardElements.push(obj.elType);
                                }
                            } else {
                                // Generate Stright Line Coordinates
                                    obj.elType = {
                                        pointSet1       : [xPoint[0], yPoint[0]],
                                        pointSet2       : [xPoint[1], yPoint[1]],
                                        pointSetName1   : obj.elType.pointSetName1,
                                        pointSetName2   : obj.elType.pointSetName2,
                                        isVisiblePoint1 : eval(obj.elType.isVisiblePoint1),
                                        isVisiblePoint2 : eval(obj.elType.isVisiblePoint2),
                                        type            : 'strightline',
                                        checkCorrectAns : false,
                                        slope           : slopeEquation[0],
                                        lineEquation    : slopeEquation[1]
                                    }
                                    if(isAnswerLayer){
                                        if(obj.getAttribute("strokeColor") !== "#000000")
                                            this.boardElements.push(obj.elType);
                                    }else{
                                        this.boardElements.push(obj.elType);
                                    }
                            }
                        }
                        // Generate Circle Coordinates
                        if (obj.elType.type === "circle"){
                            //get radius of circle
                            var circle = this.brdyy.create('circle', [[xPoint[0], yPoint[0]], [xPoint[1], yPoint[1]]], {
                                color : '#2B85C0',
                                fixed : true,
                                fillColor : this.userColor,
                                strokeColor : this.userStrokeColor,
                                strokeWidth : this.userStrokeWidth,
                                size : this.userSize,
                                fillOpacity : 0
                            });
                            obj.elType["radius"] = circle.radius;
                            if(isAnswerLayer){
                                if(obj.getAttribute("strokeColor") !== "#000000")
                                    this.boardElements.push(obj.elType);
                            }else{
                                this.boardElements.push(obj.elType);
                            }
                        }
                        // Generate Segment Coordinates
                        if (obj.elType.type === 'segment'){
                            if(isAnswerLayer){
                                if(obj.getAttribute("strokeColor") !== "#000000")
                                    this.boardElements.push(obj.elType);
                            }else{
                                this.boardElements.push(obj.elType);
                            }
                        }
                        // Generate Arrow Coordinates
                        if (obj.elType.type === 'arrow'){
                            if(isAnswerLayer){
                                if(obj.getAttribute("strokeColor") !== "#000000")
                                    this.boardElements.push(obj.elType);
                            }else{
                                this.boardElements.push(obj.elType);
                            }
                        }
                    }
                }
            }
        return this.boardElements;
        },


        generateLineSlopeEquation: function(x1,y1,x2,y2) {
            var xa = Number(x1), ya = Number(y1), xb = Number(x2), yb = Number(y2), dx = 0, dy = 0, xscale = 0, yscale = 0;
            var intercept = 0, slope = 0,r = "", resultSet = [];
            dx = xa - xb;
            dy = ya - yb;
            slope = dy/dx;
            slope = Math.round(10*slope)/10; 
            intercept = ya - slope * xa;
            intercept = Math.round(10*intercept)/10;
            result = "Y = " + slope + "x + " + intercept;
            resultSet[0] = slope;
            resultSet[1] = result;
            if(slope == Infinity || slope == -Infinity){
                resultSet[2] = "verticalLine";
            }
            return resultSet;
        },

        disableAllGraphOptions: function(id) {
            var checkedValue = document.getElementById(id).checked;
            if(checkedValue === true) {
                document.getElementById('allPlottingOptions').checked = false;
            }
        },

        changeCommand: function(com) {
            if(this.$("#plotting-preview-mode").length == 0 ) {
              this.showMessage("You have unsaved changes.", "warning");
            }
            if (this.animation != null) {
                for (var i = 0; i < this.newPoints.length; i++)
                    this.brdyy.removeObject(this.newPoints[i]);
                    this.brdyy.removeObject(this.animation);
                    this.brdyy.removeObject(this.currentPoint);
                    this.animation = null;
                    this.ccPoints = [];
                    this.newPoints = [];
            }
            this.command = com;
            this.ccPoints = [];
            this.newPoints = [];
            this.selectedObjects = [];
            this.brdyy.fullUpdate();  
            this.isShowAxisLabels();
            this.isDeleteJSXGraphObject = false;
            this.$("#delete-graph-object").removeClass("box-inset-blue-shadow");  
        },


        isShowAxisLabels: function(isShowLabels){
            if(this.$("input[name='isShowLabels']").length > 0){
                var isShowLabels = this.$("input[name='isShowLabels']").is(":checked");               
                this.doShowOrHideLabels(isShowLabels);               
            }
        },

        doShowOrHideLabels: function(isShowLabels){
            _.each(this.yaxis.defaultTicks.labels, function(labelObj){
                labelObj.visible(isShowLabels);
            });
            _.each(this.xaxis.defaultTicks.labels, function(labelObj){
                labelObj.visible(isShowLabels);
            });
        },

        downEvent: function(e) {
            var currPoint = new Array();
            currPoint[0] = Math.round(this.currentX);
            currPoint[1] = Math.round(this.currentY);
            if (isNaN(currPoint[0])) {
                currPoint[0] = 0;
            }
            if (isNaN(currPoint[1])) {
                currPoint[1] = 0;
            }
            switch (this.command) {
                case this._POINT_:
                    //var point = getNearestPoint(currPoint[0], currPoint[1]);
                    if (point != null)
                        break;
                    point = this.brdyy.create('point', [currPoint[0], currPoint[1]], {
                        snapSizeX: this.unit,
                        snapSizeY: this.unit,
                        snapToGrid: true,
                        isSinglePoint: true,
                        fillColor: this.userColor,
                        strokeColor: this.userStrokeColor,
                        strokeWidth: this.userStrokeWidth,
                        highlightcolor: 'black',
                        size: this.userSize,
                        fillOpacity: this.userfillOpacity
                    });
                    this.codeObjects[point.getName()] = "var " + point.getName() + "yy = brdyy.create('point', [" + currPoint[0] + ", " + currPoint[1] + "], {snapSizeX: " + this.unit + ", snapSizeY:" + this.unit + ", snapToGrid:true, fillColor:'" + this.userColor + "', strokeColor:'" + this.userStrokeColor + "', strokeWidth:" + this.userStrokeWidth + ", size:" + this.userSize + ", fillOpacity:" + this.userfillOpacity + "});\n";
                    var usrCoordinates = {
                        xCoords: currPoint[0],
                        yCoords: currPoint[1],
                        type: "point",
                        checkCorrectAns: false,
                        radius: 0
                    };
                    this.addMouseUpListeners(point);
                    this.currentPointsArray.push({
                        type: 'point',
                        points: [point],
                        usrCoordinates: usrCoordinates
                    });
                    break;
                case this._ARROW_:
                    var newP = false;
                    //var point = getNearestPoint(currPoint[0], currPoint[1]);
                    if (point == null || point == this.currentPoint) {
                        point = this.brdyy.create('point', [currPoint[0], currPoint[1]], {
                            fillOpacity: this.userfillOpacity,
                            snapSizeX: this.unit,
                            snapSizeY: this.unit,
                            snapToGrid: true,
                            fillColor: this.userColor,
                            strokeColor: this.userStrokeColor,
                            strokeWidth: this.userStrokeWidth,
                            size: this.userSize
                        });
                        this.codeObjects[point.getName()] = "var " + point.getName() + "yy = brdyy.create('point', [" + currPoint[0] + ", " + currPoint[1] + "], {snapSizeX: " + this.unit + ", snapSizeY:" + this.unit + ", snapToGrid:true, fillColor:'" + this.userColor + "', strokeColor:'" + this.userStrokeColor + "', strokeWidth:" + this.userStrokeWidth + ", size:" + this.userSize + ", fillOpacity:" + this.userfillOpacity + "});\n";
                        newP = true;
                    }
                    if (this.ccPoints.length == 0) {
                        this.ccPoints.push(point);
                        if (newP)
                            this.newPoints.push(point);
                        this.currentPoint = this.brdyy.create('point', [
                            function() {
                                return currentX;
                            },
                            function() {
                                return currentY;
                            }
                        ], {
                            color: this.color,
                            visible: false,
                            snapSizeX: this.unit,
                            snapSizeY: this.unit,
                            snapToGrid: true,
                            name: ""
                        });
                        this.animation = this.brdyy.create('arrow', [point, this.currentPoint], {
                            fixed: true,
                            color: this.color,
                            highlightStrokeColor: this.highlightStrokeColor
                        });
                    } else {
                        var segment = this.brdyy.create('arrow', [this.ccPoints[0], point], {
                            fillColor: this.userColor,
                            strokeColor: this.userStrokeColor,
                            highlightStrokeColor: this.highlightStrokeColor,
                            strokeWidth: this.userStrokeWidth,
                            size: this.userSize,
                            fillOpacity: this.userfillOpacity
                        });
                        this.codeObjects[segment.getName()] = "var " + segment.getName() + "yy = brdyy.create('arrow', [" + this.ccPoints[0].getName() + "yy, " + point.getName() + "yy], {fillColor:'" + this.userColor + "', strokeColor:'" + this.userStrokeColor + "', strokeWidth:" + this.userStrokeWidth + ", size:" + this.userSize + ", fillOpacity:" + this.userfillOpacity + "});\n";

                        var usrCoordinates = {
                            pointSet1: [this.ccPoints[0].coords.usrCoords[1], this.ccPoints[0].coords.usrCoords[2]],
                            pointSet2: [point.coords.usrCoords[1], point.coords.usrCoords[2]],
                            type: "arrow",
                            checkCorrectAns: false,
                            radius: 0
                        };
                        this.addMouseUpListeners(this.ccPoints[0]);
                        this.addMouseUpListeners(point);
                        this.currentPointsArray.push({
                            type: 'arrow',
                            points: [this.ccPoints[0], point],
                            usrCoordinates: usrCoordinates
                        });
                        this.ccPoints = [];
                        this.newPoints = [];
                        this.brdyy.removeObject(this.animation);
                        this.brdyy.removeObject(this.currentPoint);
                        this.animation = null;
                    }
                    break;
                case this._LINE_:
                    var newP = false;
                    //var point = getNearestPoint(currPoint[0], currPoint[1]);
                    if (point == null || point == this.currentPoint) {
                        point = this.brdyy.create('point', [currPoint[0], currPoint[1]], {
                            snapSizeX: this.unit,
                            snapSizeY: this.unit,
                            snapToGrid: true,
                            fillColor: this.userColor,
                            strokeColor: this.userStrokeColor,
                            strokeWidth: this.userStrokeWidth,
                            size: this.userSize,
                            fillOpacity: this.userfillOpacity
                        });
                        this.codeObjects[point.getName()] = "var " + point.getName() + "yy = brdyy.create('point', [" + currPoint[0] + ", " + currPoint[1] + "], {snapSizeX: " + this.unit + ", snapSizeY:" + this.unit + ", snapToGrid:true, fillColor:'" + this.userColor + "', strokeColor:'" + this.userStrokeColor + "', strokeWidth:" + this.userStrokeWidth + ", size:" + this.userSize + ", fillOpacity:" + this.userfillOpacity + "});\n";
                        newP = true;
                    }
                    if (this.ccPoints.length == 0) {
                        this.ccPoints.push(point);
                        if (newP)
                            this.newPoints.push(point);
                        this.currentPoint = this.brdyy.create('point', [
                            function() {
                                return currentX;
                            },
                            function() {
                                return currentY;
                            }
                        ], {
                            color: this.color,
                            snapSizeX: this.unit,
                            snapSizeY: this.unit,
                            snapToGrid: true,
                            name: ""
                        });
                        this.animation = this.brdyy.create('line', [point, this.currentPoint], {
                            color: this.color,
                            highlightStrokeColor: this.highlightStrokeColor
                        });
                    } else {
                        var line = this.brdyy.create('line', [this.ccPoints[0], point], {
                            highlight: true,
                            fillOpacity: this.userfillOpacity,
                            fillColor: this.userColor,
                            highlightStrokeColor: this.highlightStrokeColor,
                            strokeColor: this.userStrokeColor,
                            strokeWidth: this.userStrokeWidth,
                            size: this.userSize
                        });
                        this.codeObjects[line.getName()] = "var " + line.getName() + "yy = brdyy.create('line', [" + this.ccPoints[0].getName() + "yy, " + point.getName() + "yy], {fixed:true, fillColor:'" + this.userColor + "', strokeColor:'" + this.userStrokeColor + "', strokeWidth:" + this.userStrokeWidth + ", size:" + this.userSize + ", fillOpacity:" + this.userfillOpacity + "});\n";

                        var usrCoordinates = {
                            pointSet1: [this.ccPoints[0].coords.usrCoords[1], this.ccPoints[0].coords.usrCoords[2]],
                            pointSet2: [point.coords.usrCoords[1], point.coords.usrCoords[2]],
                            type: "strightline",
                            checkCorrectAns: false,
                            radius: 0
                        };
                        this.addMouseUpListeners(this.ccPoints[0]);
                        this.addMouseUpListeners(point);
                        this.currentPointsArray.push({
                            type: 'strightline',
                            points: [this.ccPoints[0], point],
                            usrCoordinates: usrCoordinates
                        });
                        this.ccPoints = [];
                        this.newPoints = [];
                        this.brdyy.removeObject(this.animation);
                        this.brdyy.removeObject(this.currentPoint);
                        this.animation = null;
                    }
                    break;
                case this._HLINE_:
                    var newP = false;
                    //var point = getNearestPoint(currPoint[0], currPoint[1]);
                    if (point == null || point == this.currentPoint) {
                        point = this.brdyy.create('point', [currPoint[0], currPoint[1]], {
                            snapSizeX: this.unit,
                            snapSizeY: this.unit,
                            snapToGrid: true,
                            fillColor: this.userColor,
                            strokeColor: this.userStrokeColor,
                            strokeWidth: this.userStrokeWidth,
                            size: this.userSize,
                            fillOpacity: this.userfillOpacity
                        });
                        this.codeObjects[point.getName()] = "var " + point.getName() + "yy = brdyy.create('point', [" + currPoint[0] + ", " + currPoint[1] + "], {snapSizeX: " + this.unit + ", snapSizeY:" + this.unit + ", snapToGrid:true, fillColor:'" + this.userColor + "', strokeColor:'" + this.userStrokeColor + "', strokeWidth:" + this.userStrokeWidth + ", size:" + this.userSize + ", fillOpacity:" + this.userfillOpacity + "});\n";
                        newP = true;
                    }
                    if (this.ccPoints.length == 0) {
                        this.ccPoints.push(point);
                        if (newP)
                            this.newPoints.push(point);
                        this.currentPoint = this.brdyy.create('point', [
                            function() {
                                return currentX;
                            },
                            function() {
                                return currentY;
                            }
                        ], {
                            color: this.color,
                            snapSizeX: this.unit,
                            snapSizeY: this.unit,
                            snapToGrid: true,
                            name: ""
                        });
                        this.animation = this.brdyy.create('line', [point, this.currentPoint], {
                            color: this.color,
                            straightFirst: false,
                            highlightStrokeColor: this.highlightStrokeColor
                        });
                    } else {
                        var line = this.brdyy.create('line', [this.ccPoints[0], point], {
                            straightFirst: false,
                            fillOpacity: this.userfillOpacity,
                            fillColor: this.userColor,
                            highlightStrokeColor: this.highlightStrokeColor,
                            strokeColor: this.userStrokeColor,
                            strokeWidth: this.userStrokeWidth,
                            size: this.userSize
                        });
                        this.codeObjects[line.getName()] = "var " + line.getName() + "yy = brdyy.create('line', [" + this.ccPoints[0].getName() + "yy, " + point.getName() + "yy], {straightFirst:false, fixed:true, fillColor:'" + this.userColor + "', strokeColor:'" + this.userStrokeColor + "', strokeWidth:" + this.userStrokeWidth + ", size:" + this.userSize + ", fillOpacity:" + this.userfillOpacity + "});\n";
                        var usrCoordinates = {
                            pointSet1: [this.ccPoints[0].coords.usrCoords[1], this.ccPoints[0].coords.usrCoords[2]],
                            pointSet2: [point.coords.usrCoords[1], point.coords.usrCoords[2]],
                            type: "shortline",
                            checkCorrectAns: false,
                            radius: 0
                        };
                        this.addMouseUpListeners(this.ccPoints[0]);
                        this.addMouseUpListeners(point);
                        this.currentPointsArray.push({
                            type: 'shortline',
                            points: [this.ccPoints[0], point],
                            usrCoordinates: usrCoordinates
                        });
                        this.ccPoints = [];
                        this.newPoints = [];
                        this.brdyy.removeObject(this.animation);
                        this.brdyy.removeObject(this.currentPoint);
                        this.animation = null;
                    }
                    break;

                case this._SEGMENT_:
                    var newP = false;
                    //var point = getNearestPoint(currPoint[0], currPoint[1]);
                    if (point == null || point == this.currentPoint) {
                        point = this.brdyy.create('point', [currPoint[0], currPoint[1]], {
                            fillOpacity: this.userfillOpacity,
                            snapSizeX: this.unit,
                            snapSizeY: this.unit,
                            snapToGrid: true,
                            fillColor: this.userColor,
                            strokeColor: this.userStrokeColor,
                            strokeWidth: this.userStrokeWidth,
                            size: this.userSize
                        });
                        this.codeObjects[point.getName()] = "var " + point.getName() + "yy = brdyy.create('point', [" + currPoint[0] + ", " + currPoint[1] + "], {snapSizeX: " + this.unit + ", snapSizeY:" + this.unit + ", snapToGrid:true, fillColor:'" + this.userColor + "', strokeColor:'" + this.userStrokeColor + "', strokeWidth:" + this.userStrokeWidth + ", size:" + this.userSize + ", fillOpacity:" + this.userfillOpacity + "});\n";
                        newP = true;
                    }
                    if (this.ccPoints.length == 0) {
                        this.ccPoints.push(point);
                        if (newP)
                            this.newPoints.push(point);
                        this.currentPoint = this.brdyy.create('point', [
                            function() {
                                return currentX;
                            },
                            function() {
                                return currentY;
                            }
                        ], {
                            color: this.color,
                            snapSizeX: this.unit,
                            snapSizeY: this.unit,
                            snapToGrid: true,
                            name: ""
                        });
                        this.animation = this.brdyy.create('segment', [point, this.currentPoint], {
                            color: this.color,
                            fixed: true,
                            highlightStrokeColor: this.highlightStrokeColor
                        });
                    } else {
                        var segment = this.brdyy.create('segment', [this.ccPoints[0], point], {
                            fillColor: this.userColor,
                            strokeColor: this.userStrokeColor,
                            strokeWidth: this.userStrokeWidth,
                            highlightStrokeColor: this.highlightStrokeColor,
                            size: this.userSize,
                            fillOpacity: this.userfillOpacity
                        });
                        this.codeObjects[segment.getName()] = "var " + segment.getName() + "yy = brdyy.create('segment', [" + this.ccPoints[0].getName() + "yy, " + point.getName() + "yy], {fillColor:'" + this.userColor + "', strokeColor:'" + this.userStrokeColor + "', strokeWidth:" + this.userStrokeWidth + ", size:" + this.userSize + ", fillOpacity:" + this.userfillOpacity + "});\n";

                        var usrCoordinates = {
                            pointSet1: [this.ccPoints[0].coords.usrCoords[1], this.ccPoints[0].coords.usrCoords[2]],
                            pointSet2: [point.coords.usrCoords[1], point.coords.usrCoords[2]],
                            type: "segment",
                            checkCorrectAns: false,
                            radius: 0
                        };
                        this.addMouseUpListeners(this.ccPoints[0]);
                        this.addMouseUpListeners(point);
                        this.currentPointsArray.push({
                            type: 'segment',
                            points: [this.ccPoints[0], point],
                            usrCoordinates: usrCoordinates
                        });
                        this.ccPoints = [];
                        this.newPoints = [];
                        this.brdyy.removeObject(this.animation);
                        this.brdyy.removeObject(this.currentPoint);
                        this.animation = null;
                    }
                    break;
                case this._CIRCLE_:
                    var newP = false;
                    //var point = getNearestPoint(currPoint[0], currPoint[1]);
                    if (point == null || point == this.currentPoint) {
                        point = this.brdyy.create('point', [currPoint[0], currPoint[1]], {
                            snapSizeX: this.unit,
                            snapSizeY: this.unit,
                            snapToGrid: true,
                            fillColor: this.userColor,
                            strokeColor: this.userStrokeColor,
                            strokeWidth: this.userStrokeWidth,
                            size: this.userSize,
                            fillOpacity: this.userfillOpacity
                        });
                        this.codeObjects[point.getName()] = "var " + point.getName() + "yy = brdyy.create('point', [" + currPoint[0] + ", " + currPoint[1] + "], {snapSizeX: " + this.unit + ", snapSizeY:" + this.unit + ",snapToGrid : true, fillColor:'" + this.userColor + "', strokeColor:'" + this.userStrokeColor + "', strokeWidth:" + this.userStrokeWidth + ", size:" + this.userSize + ", fillOpacity:" + this.userfillOpacity + "});\n";
                        newP = true;
                    }
                    if (this.ccPoints.length == 0) {
                        this.ccPoints.push(point);
                        if (newP)
                            this.newPoints.push(point);
                        this.currentPoint = this.brdyy.create('point', [
                            function() {
                                return currentX;
                            },
                            function() {
                                return currentY;
                            }
                        ], {
                            color: this.color,
                            snapSizeX: this.unit,
                            snapSizeY: this.unit,
                            snapToGrid: true,
                            name: ""
                        });
                        this.animation = this.brdyy.create('circle', [point, this.currentPoint], {
                            color: this.color,
                            fixed: true,
                            highlightStrokeColor: this.highlightStrokeColor,
                            fillColor: this.userColor,
                            strokeColor: this.userStrokeColor,
                            strokeWidth: this.userStrokeWidth,
                            size: this.userSize,
                            fillOpacity: 0
                        });
                    } else {
                        var circle = this.brdyy.create('circle', [this.ccPoints[0], point], {
                            color: this.color,
                            fillColor: this.userColor,
                            strokeColor: this.userStrokeColor,
                            strokeWidth: this.userStrokeWidth,
                            highlightStrokeColor: this.highlightStrokeColor,
                            size: this.userSize,
                            fillOpacity: 0
                        });
                        this.codeObjects[this.removeLaTeX(circle.getName())] = "var " + this.removeLaTeX(circle.getName()) + "yy = brdyy.create('circle', [" + this.ccPoints[0].getName() + "yy, " + point.getName() + "yy], {fixed:true, fillColor:'" + this.userColor + "', strokeColor:'" + this.userStrokeColor + "', strokeWidth:" + this.userStrokeWidth + ", size:" + this.userSize + ", fillOpacity:0});\n";
                        var usrCoordinates = {
                            pointSet1: [this.ccPoints[0].coords.usrCoords[1], this.ccPoints[0].coords.usrCoords[2]],
                            pointSet2: [point.coords.usrCoords[1], point.coords.usrCoords[2]],
                            type: "circle",
                            checkCorrectAns: false,
                            radius: circle.radius
                        };
                        this.addMouseUpListeners(this.ccPoints[0]);
                        this.addMouseUpListeners(point);
                        this.currentPointsArray.push({
                            type: 'circle',
                            points: [this.ccPoints[0], point],
                            usrCoordinates: usrCoordinates
                        });
                        this.ccPoints = [];
                        this.newPoints = [];
                        this.brdyy.removeObject(this.animation);
                        this.brdyy.removeObject(this.currentPoint);
                        this.animation = null;
                    }
                    break;
                case this._CIRCLE3_:
                    var newP = false;
                    //var point = getNearestPoint(currPoint[0], currPoint[1]);
                    if (point == null || point == currentPoint) {
                        point = brdyy.create('point', [currPoint[0], currPoint[1]], {
                            snapSizeX: unit,
                            snapSizeY: unit,
                            snapToGrid: true,
                            fillColor: userColor,
                            strokeColor: userStrokeColor,
                            strokeWidth: userStrokeWidth,
                            size: userSize,
                            fillOpacity: userfillOpacity
                        });
                        codeObjects[point.getName()] = "var " + point.getName() + "yy = brdyy.create('point', [" + currPoint[0] + ", " + currPoint[1] + "], {snapSizeX: " + unit + ", snapSizeY:" + unit + ",snapToGrid : true, fillColor:'" + userColor + "', strokeColor:'" + userStrokeColor + "', strokeWidth:" + userStrokeWidth + ", size:" + userSize + ", fillOpacity:" + userfillOpacity + "});\n";
                        newP = true;
                    }
                    ccPoints.push(point);
                    if (newP)
                        newPoints.push(point);
                    if (ccPoints.length == 2) {
                        currentPoint = brdyy.create('point', [
                            function() {
                                return currentX;
                            },
                            function() {
                                return currentY;
                            }
                        ], {
                            snapSizeX: unit,
                            snapSizeY: unit,
                            snapToGrid: true,
                            name: ""
                        });
                        animation = brdyy.create('circle', [ccPoints[0], ccPoints[1], currentPoint]);
                    } else if (ccPoints.length == 3) {
                        var circle = brdyy.create('circle', [ccPoints[0], ccPoints[1], point], {
                            fillColor: userColor,
                            strokeColor: userStrokeColor,
                            strokeWidth: userStrokeWidth,
                            size: userSize,
                            fillOpacity: 0
                        });
                        codeObjects[removeLaTeX(circle.getName())] = "var " + removeLaTeX(circle.getName()) + "yy = brdyy.create('circle', [" + ccPoints[0].getName() + "yy, " + ccPoints[1].getName() + "yy, " + point.getName() + "yy], {fixed:true, fillColor:'" + userColor + "', strokeColor:'" + userStrokeColor + "', strokeWidth:" + userStrokeWidth + ", size:" + userSize + ", fillOpacity:0});\n";
                        ccPoints = [];
                        newPoints = [];
                        brdyy.removeObject(animation);
                        brdyy.removeObject(currentPoint);
                        animation = null;
                    }
                    break;
                case this._CIRCLER_:
                    var newP = false;
                    //var point = getNearestPoint(currPoint[0], currPoint[1]);
                    if (point == null || point == currentPoint) {
                        point = brdyy.create('point', [currPoint[0], currPoint[1]], {
                            snapSizeX: unit,
                            snapSizeY: unit,
                            snapToGrid: true,
                            fillColor: userColor,
                            strokeColor: userStrokeColor,
                            strokeWidth: userStrokeWidth,
                            size: userSize,
                            fillOpacity: userfillOpacity
                        });
                        codeObjects[point.getName()] = "var " + point.getName() + "yy = brdyy.create('point', [" + currPoint[0] + ", " + currPoint[1] + "], {snapSizeX: " + unit + ", snapSizeY:" + unit + ",snapToGrid : true, fillColor:'" + userColor + "', strokeColor:'" + userStrokeColor + "', strokeWidth:" + userStrokeWidth + ", size:" + userSize + ", fillOpacity:" + userfillOpacity + "});\n";
                        newP = true;
                    }
                    var n = window.prompt("Insert radius", 5);
                    while (isNaN(n))
                        n = window.prompt("Insert radius", 5);
                    r = parseFloat(n);
                    var circle = brdyy.create('circle', [point, r], {
                        fixed: true,
                        fillColor: userColor,
                        strokeColor: userStrokeColor,
                        strokeWidth: userStrokeWidth,
                        size: userSize,
                        fillOpacity: 0
                    });
                    codeObjects[removeLaTeX(circle.getName())] = "var " + removeLaTeX(circle.getName()) + "yy = brdyy.create('circle', [" + ccPoints[0].getName() + "yy, " + r + "], {fixed:true, fillColor:'" + userColor + "', strokeColor:'" + userStrokeColor + "', strokeWidth:" + userStrokeWidth + ", size:" + userSize + ", fillOpacity:" + userfillOpacity + "});\n";

                    break;
                case this._POLYGON_:
                    var newP = false;
                    //var point = getNearestPoint(currPoint[0], currPoint[1]);
                    if (point == null || point == currentPoint) {
                        point = brdyy.create('point', [currPoint[0], currPoint[1]], {
                            snapSizeX: unit,
                            snapSizeY: unit,
                            snapToGrid: true,
                            fillColor: userColor,
                            strokeColor: userStrokeColor,
                            strokeWidth: userStrokeWidth,
                            size: userSize,
                            fillOpacity: userfillOpacity
                        });
                        codeObjects[point.getName()] = "var " + point.getName() + "yy = brdyy.create('point', [" + currPoint[0] + ", " + currPoint[1] + "], {snapSizeX: " + unit + ", snapSizeY:" + unit + ", snapToGrid:true, fillColor:'" + userColor + "', strokeColor:'" + userStrokeColor + "', strokeWidth:" + userStrokeWidth + ", size:" + userSize + ", fillOpacity:" + userfillOpacity + "});\n";
                        newP = true;
                    }
                    if (point != ccPoints[0]) {
                        ccPoints.push(point);
                        if (newP)
                            newPoints.push(point);
                        brdyy.removeObject(animation);
                        animation = brdyy.create('polygon', ccPoints, {
                            highlight: false,
                            withLines: false
                        });
                    } else {
                        brdyy.removeObject(animation);
                        var polygon = brdyy.create('polygon', ccPoints, {
                            highlight: true,
                            withLines: true,
                            hasInnerPoints: true,
                            color: userColor,
                            opacity: userfillOpacity,
                            withLabel: true
                        });
                        var strPoints = "";
                        for (var i = 0; i < ccPoints.length - 1; i++)
                            strPoints += removeLaTeX(ccPoints[i].getName()) + "yy, ";
                        strPoints += removeLaTeX(ccPoints[ccPoints.length - 1].getName()) + "yy";

                        codeObjects[removeLaTeX(polygon.getName())] = "var " + removeLaTeX(polygon.getName()) + "yy = brdyy.create('polygon', [" + strPoints + "], {highlight:true, withLines:false});\n";

                        ccPoints = [];
                        newPoints = [];
                        animation = null;
                    }
                    break;
                case this._ERASE_:
                    for (el in brdyy.objects)
                        if (brdyy.highlightedObjects[el].elType != 'slider' && substring(brdyy.highlightedObjects[el].id, 8) == '_STATIC_')
                            brdyy.removeObject(brdyy.highlightedObjects[el]);
                    break;
                case this._PENCIL_:
                    pencilPointsArray = new Array();
                    break;
                case this._INTERSECTION_:
                    for (el in brdyy.objects)
                        if (brdyy.highlightedObjects[el])
                            selectedObjects.push(brdyy.highlightedObjects[el]);

                    if (selectedObjects.length > 1) {
                        var intersection = brdyy.create('intersection', [selectedObjects[0], selectedObjects[1], 0]);
                        codeObjects[removeLaTeX(intersection.getName())] = "var " + removeLaTeX(intersection.getName()) + "yy = brdyy.create('intersection', [" + removeLaTeX(selectedObjects[0].getName()) + "yy, " + removeLaTeX(selectedObjects[1].getName()) + "yy, 0], {highlight:true});\n";
                        if (selectedObjects[0].elType == 'circle' || selectedObjects[1].elType == 'circle') {
                            intersection = brdyy.create('intersection', [selectedObjects[0], selectedObjects[1], 1], {
                                highlight: true
                            });
                            codeObjects[removeLaTeX(intersection.getName())] = "var " + removeLaTeX(intersection.getName()) + "yy = brdyy.create('intersection', [" + removeLaTeX(selectedObjects[0].getName()) + "yy, " + removeLaTeX(selectedObjects[1].getName()) + "yy, 1], {highlight:true});\n";
                        }
                        selectedObjects = [];
                    }
                    break;
                case this._ANGLE_BISECTOR_:
                    for (el in brdyy.objects)
                        if (brdyy.highlightedObjects[el]) {
                            if (JXG.isPoint(brdyy.highlightedObjects[el]) || brdyy.highlightedObjects[el].elType == 'midpoint')
                                selectedObjects.push(brdyy.highlightedObjects[el]);
                        }
                    if (selectedObjects.length > 2) {
                        var bisector = brdyy.create('bisector', [selectedObjects[0], selectedObjects[1], selectedObjects[2]], {
                            highlight: true
                        });
                        codeObjects[removeLaTeX(bisector.getName())] = "var " + removeLaTeX(bisector.getName()) + "yy = brdyy.create('bisector', [" + removeLaTeX(selectedObjects[0].getName()) + "yy, " + removeLaTeX(selectedObjects[1].getName()) + "yy, " + removeLaTeX(selectedObjects[2].getName()) + "yy], {highlight:true});\n"
                        selectedObjects = [];
                    }
                    break;
                case this._MIDPOINT_:
                    for (el in brdyy.objects)
                        if (brdyy.highlightedObjects[el]) {
                            if (JXG.isPoint(brdyy.highlightedObjects[el]) || brdyy.highlightedObjects[el].elType == 'midpoint')
                                selectedObjects.push(brdyy.highlightedObjects[el]);
                        }
                    if (selectedObjects.length > 1) {
                        var midpoint = brdyy.create('midpoint', [selectedObjects[0], selectedObjects[1]], {
                            highlight: true
                        });
                        codeObjects[removeLaTeX(midpoint.getName())] = "var " + removeLaTeX(midpoint.getName()) + "yy = brdyy.create('midpoint', [" + removeLaTeX(selectedObjects[0].getName()) + "yy, " + removeLaTeX(selectedObjects[1].getName()) + "yy], {highlight:true});\n";
                        selectedObjects = [];
                    }
                    break;
                case this._PERPENDICULAR_:
                    for (el in brdyy.objects)
                        if (brdyy.highlightedObjects[el]) {
                            if (selectedObjects.length == 1 && (JXG.isPoint(brdyy.highlightedObjects[el]) || brdyy.highlightedObjects[el].elType == 'midpoint' || brdyy.highlightedObjects[el].elType == 'intersection'))
                                selectedObjects.push(brdyy.highlightedObjects[el]);
                            else if (selectedObjects.length == 0 && (brdyy.highlightedObjects[el].elType == 'line' || brdyy.highlightedObjects[el].elType == 'segment' || brdyy.highlightedObjects[el].elType == 'perpendicular' || brdyy.highlightedObjects[el].elType == 'bisector' || brdyy.highlightedObjects[el].elType == 'parallel'))
                                selectedObjects.push(brdyy.highlightedObjects[el]);
                        }
                    if (selectedObjects.length > 1) {
                        var perp = brdyy.create('perpendicular', [selectedObjects[0], selectedObjects[1]], {
                            highlight: true
                        });
                        codeObjects[removeLaTeX(perp.getName())] = "var " + removeLaTeX(perp.getName()) + "yy = brdyy.create('perpendicular', [" + removeLaTeX(selectedObjects[0].getName()) + "yy, " + removeLaTeX(selectedObjects[1].getName()) + "yy], {highlight:true});\n"
                        selectedObjects = [];
                    }
                    break;
                case this._PARALLEL_:
                    for (el in brdyy.objects)
                        if (brdyy.highlightedObjects[el]) {
                            if (selectedObjects.length == 1 && (JXG.isPoint(brdyy.highlightedObjects[el]) || brdyy.highlightedObjects[el].elType == 'midpoint'))
                                selectedObjects.push(brdyy.highlightedObjects[el]);
                            else if (selectedObjects.length == 0 && (brdyy.highlightedObjects[el].elType == 'line' || brdyy.highlightedObjects[el].elType == 'segment' || brdyy.highlightedObjects[el].elType == 'perpendicular' || brdyy.highlightedObjects[el].elType == 'bisector' || brdyy.highlightedObjects[el].elType == 'parallel'))
                                selectedObjects.push(brdyy.highlightedObjects[el]);
                        }
                    if (selectedObjects.length > 1) {
                        var paralel = brdyy.create('parallel', [selectedObjects[0], selectedObjects[1]], {
                            highlight: true
                        });
                        codeObjects[removeLaTeX(paralel.getName())] = "var " + removeLaTeX(paralel.getName()) + "yy = brdyy.create('parallel', [" + removeLaTeX(selectedObjects[0].getName()) + "yy, " + removeLaTeX(selectedObjects[1].getName()) + "yy], {highlight:true});\n"
                        selectedObjects = [];
                    }
                    break;
                case this._SYMMETRY_:
                    for (el in brdyy.objects)
                        if (brdyy.highlightedObjects[el]) {
                            if (JXG.isPoint(brdyy.highlightedObjects[el]) || brdyy.highlightedObjects[el].elType == 'midpoint' || brdyy.highlightedObjects[el].elType == 'intersection')
                                selectedObjects.push(brdyy.highlightedObjects[el]);
                        }
                    if (selectedObjects.length == 2) {
                        var line = brdyy.create('line', [selectedObjects[0], selectedObjects[1]], {
                            visible: false
                        });
                        var circle = brdyy.create('circle', [selectedObjects[1], selectedObjects[0]], {
                            visible: false
                        });
                        var symmetry = brdyy.create('intersection', [line, circle], {
                            highlight: true
                        });
                        codeObjects[removeLaTeX(line.getName())] = "var " + removeLaTeX(line.getName()) + "yy = brdyy.create('line', [" + removeLaTeX(selectedObjects[0].getName()) + "yy, " + removeLaTeX(selectedObjects[1].getName()) + "yy], {visible:false});\n"
                        codeObjects[removeLaTeX(circle.getName())] = "var " + removeLaTeX(circle.getName()) + "yy = brdyy.create('circle', [" + removeLaTeX(selectedObjects[1].getName()) + "yy, " + removeLaTeX(selectedObjects[0].getName()) + "yy], {visible:false});\n"
                        codeObjects[removeLaTeX(symmetry.getName())] = "var " + removeLaTeX(symmetry.getName()) + "yy = brdyy.create('intersection', [" + removeLaTeX(line.getName()) + "yy, " + removeLaTeX(circle.getName()) + "yy], {highlight:true});\n"
                        selectedObjects = [];
                    }
                    break;
                case this._CHANGE_ATTR_:
                    for (el in brdyy.objects) {
                        if (brdyy.highlightedObjects[el]) {
                            if (brdyy.highlightedObjects[el].elType == 'text')
                                brdyy.highlightedObjects[el].setAttribute({
                                    color: userStrokeColor,
                                    fontsize: userSize * 5
                                });
                            else
                                brdyy.highlightedObjects[el].setAttribute({
                                    fillColor: userColor,
                                    strokeColor: userStrokeColor,
                                    strokeWidth: userStrokeWidth,
                                    size: userSize,
                                    fillOpacity: userfillOpacity
                                });

                            brdyy.highlightedObjects[el].update();
                        }
                    }
                    break;
                case this._TEXT_:
                    var insertText = document.getElementById("userInputText").value;
                    point = brdyy.create('point', [currPoint[0], currPoint[1]], {
                        snapSizeX: unit,
                        snapSizeY: unit,
                        snapToGrid: true,
                        fillColor: userColor,
                        strokeColor: userStrokeColor,
                        strokeWidth: userStrokeWidth,
                        size: userSize,
                        fillOpacity: userfillOpacity,
                        withLabel: false
                    });
                    codeObjects[point.getName()] = "var " + point.getName() + "yy = brdyy.create('point', [" + currPoint[0] + ", " + currPoint[1] + "], {snapSizeX: " + unit + ", snapSizeY:" + unit + ", snapToGrid:true, fillColor:'" + userColor + "', strokeColor:'" + userStrokeColor + "', strokeWidth:" + userStrokeWidth + ", size:" + userSize + ", fillOpacity:" + userfillOpacity + ", withLabel:false});\n";
                    var text = brdyy.create('text', [
                        function() {
                            return point.X() + 2
                        },
                        function() {
                            return point.Y() + 2
                        },
                        insertText
                    ], {
                        fontsize: userSize * 5,
                        color: userStrokeColor
                    });
                    codeObjects[removeLaTeX(text.getName())] = "var " + removeLaTeX(text.getName()) + "yy = brdyy.create('text', [function() {return " + point.getName() + "yy.X()}, function() {return " + point.getName() + "yy.Y()}, '" + insertText + "'], {fontsize:" + userSize * 5 + ", color:'" + userStrokeColor + "'});\n";

                    break;
                case this._SLIDER_:
                    var startValue = parseInt(document.getElementById("sliderStart").value);
                    var endValue = parseInt(document.getElementById("sliderEnd").value);
                    var stepValue = parseInt(document.getElementById("sliderStep").value);

                    if (ccPoints.length == 0) {
                        var point = brdyy.create('point', [currPoint[0], currPoint[1]], {
                            fillOpacity: userfillOpacity,
                            snapSizeX: unit,
                            snapSizeY: unit,
                            snapToGrid: true,
                            fillColor: userColor,
                            strokeColor: userStrokeColor,
                            strokeWidth: userStrokeWidth,
                            size: userSize
                        });
                        ccPoints.push(point);
                        currentPoint = brdyy.create('point', [
                            function() {
                                return currentX;
                            },
                            function() {
                                return currentY;
                            }
                        ], {
                            snapSizeX: unit,
                            snapSizeY: unit,
                            snapToGrid: true,
                            name: ""
                        });
                        animation = brdyy.create('segment', [point, currentPoint], {
                            fixed: true
                        });
                    } else {
                        var slider = brdyy.create('slider', [
                            [ccPoints[0].X(), ccPoints[0].Y()],
                            [currentX, currentY],
                            [startValue, 1, endValue]
                        ], {
                            snapWidth: stepValue,
                            size: userSize
                        });
                        sliders.push("var slider" + sliders.length + "yy = brdyy.create('slider', [[" + ccPoints[0].X() + ", " + ccPoints[0].Y() + "], [" + currentX + ", " + currentY + "], [" + startValue + ", 1, " + endValue + "]], {snapWidth: " + stepValue + ", size: " + userSize + "});\n");
                        ccPoints = [];
                        brdyy.removeObject(animation.getParents()[0]);
                        brdyy.removeObject(animation);
                        brdyy.removeObject(currentPoint);
                        brdyy.removeObject(point);
                        animation = null;
                    }
                    break;
                }
              this.showMessage("You have unsaved changes.", "warning");
              this.brdyy.update();
        },

        getNearestPoint: function(x, y) {
            i = 0;
            for (el in this.brdyy.objects) {
                if (JXG.isPoint(this.brdyy.objects[el]))
                    if (Math.sqrt(Math.pow(this.brdyy.objects[el].X() - x, 2) + Math.pow(this.brdyy.objects[el].Y() - y, 2)) < 0.8)
                        return this.brdyy.objects[el];
            }
            return null;
        },

        removeLaTeX: function(str) {
            str = str.replace("_", "");
            str = str.replace("{", "");
            str = str.replace("}", "");
            return str;
        },

        getMouseCoords: function(e, n) {// n=0 for mouse events, e=1 for tablet events
            var pos;
            if (n == 0)
                pos = _this.brdyy.getMousePosition(e);
            else
                pos = _this.brdyy.getMousePosition(e, 0);

            var dx = pos[0], dy = pos[1];
            return new JXG.Coords(JXG.COORDS_BY_SCREEN, [dx, dy], _this.brdyy);
        },

        touchMove: function(e) {
            var coords = _this.getMouseCoords(e, 1);
            _this.currentX = coords.usrCoords[1];
            _this.currentY = coords.usrCoords[2];

            document.getElementById('xCoord').value = _this.currentX;
            document.getElementById('yCoord').value = _this.currentY;

            if (e.pencilPointsArray != null) {
                var curvePoint = _this.brdyy.create('point', [_this.currentX, _this.currentY], {
                    name : false,
                    fixed : true,
                    highlight : false,
                    showInfoBox : true,
                    color : _this.userColor,
                    size : 2
                });
                _this.pencilPointsArray.push(curvePoint);
            }
            _this.brdyy.update();
        },

        mouseMove: function(e) {
            var coords = _this.getMouseCoords(e, 0);
            _this.currentX = coords.usrCoords[1];
            _this.currentY = coords.usrCoords[2];
            currentX = coords.usrCoords[1];
            currentY = coords.usrCoords[2];
            document.getElementById('xCoord').value = _this.currentX;
            document.getElementById('yCoord').value = _this.currentY;

            if (e.pencilPointsArray != null) {
                var curvePoint = _thise.brdyy.create('point', [_this.currentX, _this.currentY], {
                    name : false,
                    fixed : true,
                    highlight : false,
                    showInfoBox : true,
                    color : _this.userColor,
                    size : 2
                });
                _this.pencilPointsArray.push(curvePoint);
            }
            _this.brdyy.update();
        },

        mouseUp: function(e) {
            if (_this.pencilPointsArray != null) {
                for ( i = 0; i < _this.pencilPointsArray.length - 1; i++)
                    brdyy.create('segment', [_this.pencilPointsArray[i], _this.pencilPointsArray[i + 1]], {
                        strokeWidth : 8,
                        strokeColor : _this.userColor,
                        highlight : false
                    });
                document.getElementById("generateButton").disabled = true;
                _this.pencilPointsArray = null;
            }
        },

        mouseDown: function(e) {
            var coords = _this.getMouseCoords(e, 0);
            _this.currentX = coords.usrCoords[1];
            _this.currentY = coords.usrCoords[2];
            var canCreate = true, el;
            for (el in _this.brdyy.objects) {
                if(JXG.isPoint(_this.brdyy.objects[el]) && _this.brdyy.objects[el].hasPoint(Math.round(_this.currentX), Math.round(_this.currentY))) {
                    canCreate = false;
                    break;
                }
            }
            if(canCreate){
                _this.downEvent(e);
            }
            _this.isShowAxisLabels();
        },

        touchStart: function(e) {
            var coords = _this.getMouseCoords(e, 1);
            _this.currentX = coords.usrCoords[1];
            _this.currentY = coords.usrCoords[2];
            var canCreate = true,
               el;
            for (el in _this.brdyy.objects) {
               if (JXG.isPoint(_this.brdyy.objects[el]) && _this.brdyy.objects[el].hasPoint(Math.round(_this.currentX), Math.round(_this.currentY))) {
                   canCreate = false;
                   break;
               }
            }
            if (canCreate) {
               _this.downEvent(e);
            }
            _this.isShowAxisLabels();
        },

        registerEvents: function() {
            this.brdyy.on('mousedown', this.mouseDown);
            this.brdyy.on('touchstart', this.touchStart);
            this.brdyy.on('mousemove', this.mouseMove);
            this.brdyy.on('touchmove', this.touchMove);
            this.brdyy.on('mouseup', this.mouseUp);
            this.brdyy.on('touchend', this.mouseUp);
        }
        
    });
    return JSXGraphView;
});
