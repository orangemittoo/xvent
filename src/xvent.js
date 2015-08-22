// - 処理
//   - documentLoaded後にwindowに対してイベントを貼る
//   - ターゲット含む親要素にdata-xventがあればスタイル用暮らすを付与する
//   - ターゲット含む親要素にdata-xvent-event=""があればその要素のイベントととしてイベント発行
//   - data-xvent-eventがある要素にdata-xvent-global属性があればwindowイベントとして発行
//   - data-xvent-eventがある要素にdata-xvent-params属性があればそのデータを第二引数に付与する
//   - data-xvent-eventがある要素にdata-xvent-nobusterがある場合はclickバスターしない


(function($, global, undefined) {
    'use strict'
    var app = {
      defOptions: {
        touchStartClassName: "is-active",
        attrPrefix: 'data-xvent',
        touchTime: 1300,
        moveRange: 40
      },
      state: {},
      initialize: function(targetElement, options){
        app.$global = $(global);
        app.$targetElement = targetElement;
        app.setAppData(options);
        app.setListener();

        return targetElement;
      },
      setAppData: function(options){
        var pointer = {
          start: 'ontouchstart' in global ? 'touchstart' : 'mousedown',
          move: 'ontouchmove' in global ? 'touchmove' : 'mousemove',
          end: 'ontouchend' in global ? 'touchend' : 'mouseup'
        }

        app.data = $.extend(app.defOptions, options);
        app.data = $.extend(app.data, {
          toushStartAttr: app.data.attrPrefix,
          elementEventAttr: app.data.attrPrefix + "-event",
          elementEventGlobalAttr: app.data.attrPrefix + "-global",
          elementEventParamsAttr: app.data.attrPrefix + "-params",
          pointer: {
            start: pointer.start,
            move: pointer.move,
            end: pointer.end
          },
          clickBusterTime: 600
        });
      },
      setListener: function(){
        app.$targetElement.on(app.data.pointer.start, app.onStart);
      },
      onStart: function(evt){
        app.state.touched = true;
        var pos = app.getPosition(evt);
        app.state.posX = pos.x;
        app.state.posY = pos.y;
        app.activeTouchStartClass(evt);
        app.startEvent();
      },
      onMove: function(evt){
        app.inRange(evt)
        if (!app.inRange(evt)) {
          app.onEnd();
        }
      },
      onEnd: function(evt){
        app.state.touched = false;
        app.endEvent();
        if (!app.state.isTouchStartActived) {
          return;
        }
        app.deactiveTouchStartClass();
        app.trackEvent(evt);
        app.clickBuster(evt);
      },
      startEvent: function(){
        app.$targetElement.on(app.data.pointer.move, app.onMove);
        app.$targetElement.on(app.data.pointer.end, app.onEnd);
      },
      endEvent: function(){
        app.$targetElement.off(app.data.pointer.move, app.onMove);
        app.$targetElement.off(app.data.pointer.end, app.onEnd);
      },
      activeTouchStartClass: function(evt){
        app.$touchStartElement = app.getElement(evt.target, app.data.toushStartAttr);
        if (!app.$touchStartElement) {return};
        app.$touchStartElement.addClass(app.data.touchStartClassName);
        app.state.isTouchStartActived = true;

        global.setTimeout(function(){
          app.state.isTouchStartActived && app.onEnd();
        }, app.data.touchTime);
      },
      deactiveTouchStartClass: function(){
        app.$touchStartElement.removeClass(app.data.touchStartClassName);
        app.state.isTouchStartActived = false;
      },
      trackEvent: function(evt){
        if (!evt) {return;}
        var $element = app.getElement(evt.target, app.data.elementEventAttr);
        if (!$element) {return;}
        var eventName = $element.attr(app.data.elementEventAttr);
        var isGlobal = $element.attr(app.data.elementEventGlobalAttr) !== undefined;
        var eventParams = $element.attr(app.data.elementEventParamsAttr);
        var $eventTarget = isGlobal ? $(global) : $element;

        $eventTarget.trigger(eventName, { data: app.parseJSON(eventParams), orgTargetEvent: evt });
        app.$global.trigger("Xvent", { event: evt });
      },
      clickBuster: function(evt){
        if (!evt) {return;}
        var target = evt.target;
        if (!!$(target).attr('data-xvent-nobuster')) {return;}

        var clickEvent = document.createEvent("MouseEvents");

        clickEvent.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
        target.dispatchEvent( clickEvent );

        document.addEventListener("click", cb, true);
        document.addEventListener("mouseup", cb, true);

        setTimeout(function() {
          document.removeEventListener("click", cb, true);
          document.removeEventListener("mouseup", cb, true);
        }, app.data.clickBusterTime);

        return;

        function cb(e) {
          e.stopPropagation();
          e.preventDefault();
        }
      },
      getElement: function(target, attrName){
        var $target = $(target);
        if ($target.attr(attrName) !== undefined) {
          return $target;
        }
        $target = $($target.closest("["+attrName+"]")[0]);
        return $target.length ? $target : null;
      },
      getPosition: function(evt){
        evt = evt.originalEvent
        if (evt.touches && evt.touches[0]) {
            evt = evt.touches[0];
        }
        return {
          x: evt.clientX || evt.offsetX,
          y: evt.clientY || evt.offsetY
        }
      },
      inRange: function(evt){
        var pos = app.getPosition(evt);
        console.log("CONSOLE_DEBUG", Math.abs(pos.x - app.state.posX) <= app.data.moveRange && Math.abs(pos.y - app.state.posY) <= app.data.moveRange)
        return Math.abs(pos.x - app.state.posX) <= app.data.moveRange &&
                Math.abs(pos.y - app.state.posY) <= app.data.moveRange
      },
      parseJSON: function(text){
        if (!text) {return};
        if (typeof text === "object") {return text};
        var obj;
        try {
          obj = JSON.parse(text);
          return obj;
        }catch (e) {}
        try {
          obj = (new Function("return " + text))();
          return obj;
        }catch (e) {
          throw new Error("Can't parse text to json");
        }
      }
    }

    $.fn.xvent = function(options){
      return app.initialize(this, options);
    };
})(jQuery, self || this);