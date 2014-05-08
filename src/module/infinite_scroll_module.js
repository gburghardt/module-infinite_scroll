Module.InfiniteScrollModule = Module.Base.extend({

	prototype: {

		averagePageHeight: -1,

		disabled: false,

		offset: 0,

		options: {
			autoCheckScrollPosition: true,
			charset: "utf-8",
			limit: 10,
			limitParam: "limit",
			method: "GET",
			offsetParam: "offset",
			pageClassName: "infiniteScroll-page",
			period: 200,
			threshold: 500,
			url: null,
			view: null
		},

		_newPageTagNames: {
			table: "tbody",
			ol: "li",
			ul: "li"
		},

		pageContainer: null,

		scrollTimer: null,

		totalHeight: 0,

		_ready: function() {
			Module.Base.prototype._ready.call(this);

			if (!this.options.url) {
				throw new Error("Missing required option: url");
			}

			this.elementStore.returnNative = true;
			this.handleScroll = this.handleScroll.bind(this);
			this.checkScrollPosition = this.checkScrollPosition.bind(this);
			this.pageContainer = this.element.querySelector(".infiniteScroll-container");
			this.enable();
		},

		destructor: function(keepElement) {
			if (this.element) {
				this.disable();
			}

			Module.Base.prototype.destructor.call(this, keepElement);
		},

		checkScrollPosition: function() {
			this.scrollTimer = null;

			if (this._nearThreshold()) {
				this._search();
			}
		},

		_createNewPage: function() {
			var nodeName = this.pageContainer.nodeName.toLowerCase(),
			    tagName = this._newPageTagNames[nodeName] || "div",
			    page = this.document.createElement(tagName);

			if (tagName === "tbody") {
				with(page.insertRow(0)) {
					with(insertCell(0)) {
						style.height = this._getAveragePageHeight() + "px";
					}
				}
			}
			else {
				page.style.height = this._getAveragePageHeight() + "px";
			}

			page.className = this.options.pageClassName + " loading";

			return page;
		},

		disable: function() {
			this.disabled = true;

			if (this.scrollTimer) {
				this.window.clearTimeout(this.scrollTimer);
			}

			this.element.removeEventListener("scroll", this.handleScroll, false);
		},

		enable: function() {
			this.element.addEventListener("scroll", this.handleScroll, false);

			if (this.options.autoCheckScrollPosition) {
				this.checkScrollPosition();
			}

			this.disabled = false;
		},

		_getAveragePageHeight: function() {
			if (this.averagePageHeight < 0) {
				var pages = this._getPages(),
				    i = 0, length = pages.length,
				    total = 0;

				for (i; i < length; i++) {
					total += pages[i].offsetHeight;
				}

				this.totalHeight = total;
				this.averagePageHeight = Math.round(total / pages.length);
			}

			return this.averagePageHeight;
		},

		_getPages: function() {
			return this.pageContainer
				.querySelectorAll("." + this.options.pageClassName);
		},

		handleScroll: function(event) {
			console.log("scrolled");

			if (this.scrollTimer) {
				this.window.clearTimeout(this.scrollTimer);
			}

			this.scrollTimer = this.window.setTimeout(this.checkScrollPosition, this.options.period);
		},

		_nearThreshold: function() {
			return (this.element.scrollHeight - this.element.clientHeight - this.element.scrollTop <= this.options.threshold);
		},

		_search: function() {
			var offset = this.offset++,
			    offsetParam = this.options.offsetParam,
			    limit = this.options.limit,
			    limitParam = this.options.limitParam,
			    params = this.window.escape(limitParam) + "=" + limit
			           + "&" + this.window.escape(offsetParam) + "=" + offset;
			    url = this.options.url,
			    method = (this.options.method || "GET").toUpperCase(),
			    xhr = new XMLHttpRequest(),
			    page = this._createNewPage(),
			    self = this,
			    onreadystatechange = function() {
			    	if (this.readyState < 4) {
			    		return;
			    	}
			    	else if (this.status === 200) {
			    		success();
			    		complete();
			    	}
			    	else if (this.status === 404) {
			    		// We've reached the end of the line. No more results to show.
			    		page.parentNode.removeChild(page);
			    		self.offset--;
			    		self.disable();
			    		complete();
			    	}
			    	else if (this.status >= 400) {
			    		complete();
			    		throw new Error("Request " + method + " " + url + " failed with status: " + xhr.status);
			    	}
			    },
			    success = function() {
			    	var type = xhr.getResponseHeader("content-type");

			    	if (/text\/html/i.test(type)) {
			    		page.innerHTML = xhr.responseText;
			    		afterPageRendered();
			    	}
			    	else if (/(application|text)\/json/i.test(type)) {
			    		if (!self.options.view) {
			    			throw new Error("Missing required option: view");
			    		}

			    		self.render(self.options.view, JSON.parse(xhr.responseText), page)
			    			.done(afterPageRendered);
			    	}
			    	else {
			    		throw new Error("Unknown content-type: " + type);
			    	}
			    },
			    afterPageRendered = function() {
			    	page.style.height = "";
			    	self._loaded(page);
			    	self._updateAverageHeight(page);
			    },
			    complete = function() {
			    	xhr = xhr.onreadystatechange = page = self = null;
			    };

			this.pageContainer.appendChild(page);

			if (method === "GET") {
				url += ((url.indexOf("?") === -1) ? "?" : "&") + params;
			}

			xhr.onreadystatechange = onreadystatechange;
			xhr.open(method, url);
			xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");

			if (method === "POST") {
				xhr.setRequestHeader("Content-Type: application/x-www-form-urlencoded; charset=" + this.options.charset);
				xhr.send(params);
			}
			else {
				xhr.send(null);
			}
		},

		_updateAverageHeight: function(page) {
			this.totalHeight += page.offsetHeight;
			this.averagePageHeight = Math.round(this.totalHeight / (this.offset + 1));
		}

	}

});
