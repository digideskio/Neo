(function() {
  "use strict";

  Neo.Classes.ViewManager = function() {
    this.views = {};
    this.currentView = null;
    this.currentViewName = null;
    this.viewContainer = document.getElementById("viewContainer");
    this.holder1 = null;
    this.holder2 = null;

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
      if (e.state !== null) {
        this.loadView(e.state.viewName);
      }
    }.bind(this));
  };

  Neo.Classes.ViewManager.prototype = {
    loadView: function(viewName, success) {
      var successCb = success || function() {};
      var self = this;

      if (this.currentViewName === viewName) {
        successCb();
        return;
      }

      var slideIn = function() {
        setTimeout(function() {
          this.holder2.style.left = 0; // slide in the next view
          this.holder2.addEventListener("transitionend", function(holderToRemove) {
            this.viewContainer.removeChild(holderToRemove);
          }.bind(this, this.holder1));
          this.holder1 = this.holder2;
          this.holder2 = null;

          history.pushState({viewName: viewName}, null, "?v=" + viewName);
          successCb();
        }.bind(this), 0);
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
        parentDom: attachTo
      });
    },

    _createHolder: function(top, left) {
      var holder = document.createElement("div");

      holder.className = "viewHolder";
      holder.style.top = top + "px";
      holder.style.left = left + "px";
      this.viewContainer.appendChild(holder);

      return holder;
    }
  };
}());