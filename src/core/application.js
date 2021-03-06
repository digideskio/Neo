(function() {
  "use strict";

  Neo.Classes.Application = Neo.Classes.UIComponent.extend({
    init: function() {
      Neo.Classes.UIComponent.call(this, {
        name: "Application",
        parentDom: document.body,
        parent: "APPLICATION_ROOT",
        eventRoot: "APPLICATION_ROOT"
      });

      this.views = {};
      this.currentView = null;
      this.currentViewName = null;
      this.viewContainer = this.dom;
      this.holder1 = null;
      this.holder2 = null;
      this.firstViewLoad = true;
      this.loadingFromPopState = false;

      var viewName = "index";   // Default view = index

      if (Neo.ENV === "dev") {
        var qs = Neo.parseQueryString();

        if ("v" in qs) {
          viewName = qs.v;
        }
      } else {
        viewName = Neo.CURRENT_VIEW_NAME;
      }

      this.holder1 = this._createHolder(0, 0);
      this.loadView(viewName, function() {
        if (typeof window.callPhantom === 'function') {
          callPhantom({msg: "PAGE_READY"});
        }
      });

      window.addEventListener("popstate", function(e) {
        this.loadingFromPopState = true;
        this.loadView(e.state.viewName);
      }.bind(this));
    },

    loadView: function(viewName, success, reload) {
      var successCb = success || function() {};
      var self = this;

      if (this.currentViewName === viewName) {
        successCb();
        return;
      }

      if (reload) {
        window.location = this._resolveURL(viewName);
        return;
      }

      var slideIn = function() {
        this.holder2.getBoundingClientRect();
        this.holder2.style.left = 0; // slide in the next view
        this.holder2.addEventListener("transitionend", function(holderToRemove, e) {
          if (e.target === holderToRemove) {
            this.viewContainer.removeChild(holderToRemove);
          }
        }.bind(this, this.holder1));
        this.holder1 = this.holder2;
        this.holder2 = null;

        if (this.firstViewLoad) {
          this.firstViewLoad = false;
          history.replaceState({viewName: viewName}, null, this._resolveURL(viewName));
        } else {
          // Dont modify history if we are loading this view due to 'back'
          // or 'forward' button, thats what 'loadingFromPopState' indicates.
          if (this.loadingFromPopState) {
            this.loadingFromPopState = false;
          } else {
            history.pushState({viewName: viewName}, null, this._resolveURL(viewName));
          }
        }

        successCb();
      }.bind(this);

      var packageLoaded = function() {
        this.holder2 = this._createHolder(0, innerWidth);
        var view = this._createInstanceAndAttachViewToDOM(viewName, this.holder2);
        this.views[viewName] = view;
        slideIn();
      }.bind(this);

      if (viewName in this.views) { // is view already loaded?
        this.holder2 = this._createHolder(0, innerWidth);
        this.holder2.appendChild(this.views[viewName].dom);
        slideIn();
      } else {
        if (Neo.ENV === "dev") {
          Neo.Loader.loadPackage(viewName, packageLoaded);
        } else {
          packageLoaded();
        }
      }
    },

    getCurrentView: function() {
      return this.currentView;
    },

    getCurrentViewName: function() {
      return this.currentViewName;
    },

    _createInstanceAndAttachViewToDOM: function(viewName, attachTo) {
      // capitalize the first letter of the view name
      var className = viewName.charAt(0).toUpperCase() + viewName.substr(1);

      return Neo.createComponent({
        name: className,
        parentDom: attachTo,
        parent: this,
        eventRoot: this.eventStore
      });
    },

    _createHolder: function(top, left) {
      var holder = document.createElement("div");

      holder.className = "viewHolder";
      holder.style.top = top + "px";
      holder.style.left = left + "px";
      this.viewContainer.appendChild(holder);

      return holder;
    },

    _resolveURL: function(viewName) {
      if (Neo.ENV === "dev" || Neo.ENV === "webApp") {
        return "?v=" + viewName;
      } else if (Neo.ENV === "web") {
        return viewName + ".html";
      }
    }
  });
}());