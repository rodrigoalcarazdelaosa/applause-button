import "document-register-element/build/document-register-element";

const VERSION = "3.3.0";
const API = "https://api.applause-button.com";

const getClaps = (api, url) =>
  // TODO: polyfill for IE (not edge)
  fetch(`${api}/get-claps` + (url ? `?url=${url}` : ""), {
    headers: {
      "Content-Type": "text/plain"
    }
  }).then(response => response.text());

const updateClaps = (api, claps, url) =>
  // TODO: polyfill for IE (not edge)
  fetch(`${api}/update-claps` + (url ? `?url=${url}` : ""), {
    method: "POST",
    headers: {
      "Content-Type": "text/plain"
    },
    body: JSON.stringify(`${claps},${VERSION}`)
  }).then(response => response.text());

const arrayOfSize = size => new Array(size).fill(undefined);

const formatClaps = claps => claps.toLocaleString("en");

// toggle a CSS class to re-trigger animations
const toggleClass = (element, cls) => {
  element.classList.remove(cls);

  // Force layout reflow
  void element.offsetWidth;

  element.classList.add(cls);
};

const debounce = (fn, delay) => {
  var timer = null;
  return function() {
    var context = this,
      args = arguments;
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(context, args), delay);
  };
};

// https://github.com/WebReflection/document-register-element#v1-caveat
class HTMLCustomElement extends HTMLElement {
  constructor(_) {
    return (_ = super(_)).init(), _;
  }
  init() {}
}

const MAX_MULTI_CLAP = 10;

class ApplauseButton extends HTMLCustomElement {
  connectedCallback() {
    if (this._connected) {
      return;
    }

    this.classList.add("loading");
    this.style.display = "block";
    // when the color of the button is set via its color property, various
    // style properties are set on style-root, which are then inherited by the child elements
    this.innerHTML = `
      <div class="style-root">
        <div class="shockwave"></div>
        <div class="count-container">
          <div class="count"></div>
        </div>
        <svg id="palmas" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36"><path fill="#EF9645" d="M32.302 24.347c-.695-1.01-.307-2.47-.48-4.082-.178-2.63-1.308-5.178-3.5-7.216l-7.466-6.942s-1.471-1.369-2.841.103c-1.368 1.471.104 2.84.104 2.84l3.154 2.934 2.734 2.542s-.685.736-3.711-2.078l-10.22-9.506s-1.473-1.368-2.842.104c-1.368 1.471.103 2.84.103 2.84l9.664 8.989c-.021-.02-.731.692-.744.68L5.917 5.938s-1.472-1.369-2.841.103c-1.369 1.472.103 2.84.103 2.84L13.52 18.5c.012.012-.654.764-.634.783l-8.92-8.298s-1.472-1.369-2.841.103c-1.369 1.472.103 2.841.103 2.841l9.484 8.82c.087.081-.5.908-.391 1.009l-6.834-6.356s-1.472-1.369-2.841.104c-1.369 1.472.103 2.841.103 2.841L11.896 30.71c1.861 1.731 3.772 2.607 6.076 2.928.469.065 1.069.065 1.315.096.777.098 1.459.374 2.372.934 1.175.72 2.938 1.02 3.951-.063l3.454-3.695 3.189-3.412c1.012-1.082.831-2.016.049-3.151z"/><path d="M1.956 35.026c-.256 0-.512-.098-.707-.293-.391-.391-.391-1.023 0-1.414L4.8 29.77c.391-.391 1.023-.391 1.414 0s.391 1.023 0 1.414l-3.551 3.55c-.195.195-.451.292-.707.292zm6.746.922c-.109 0-.221-.018-.331-.056-.521-.182-.796-.752-.613-1.274l.971-2.773c.182-.521.753-.795 1.274-.614.521.183.796.753.613 1.274l-.971 2.773c-.144.412-.53.67-.943.67zm-7.667-7.667c-.412 0-.798-.257-.943-.667-.184-.521.089-1.092.61-1.276l2.495-.881c.523-.18 1.092.091 1.276.61.184.521-.089 1.092-.61 1.276l-2.495.881c-.111.039-.223.057-.333.057zm29.46-21.767c-.256 0-.512-.098-.707-.293-.391-.391-.391-1.024 0-1.415l3.552-3.55c.391-.39 1.023-.39 1.414 0s.391 1.024 0 1.415l-3.552 3.55c-.195.196-.451.293-.707.293zm-4.164-1.697c-.109 0-.221-.019-.33-.057-.521-.182-.796-.752-.614-1.274l.97-2.773c.183-.521.752-.796 1.274-.614.521.182.796.752.614 1.274l-.97 2.773c-.144.413-.531.671-.944.671zm6.143 5.774c-.412 0-.798-.257-.943-.667-.184-.521.09-1.092.61-1.276l2.494-.881c.522-.185 1.092.09 1.276.61.184.521-.09 1.092-.61 1.276l-2.494.881c-.111.039-.223.057-.333.057z" fill="#FA743E"/><path fill="#FFDB5E" d="M35.39 23.822c-.661-1.032-.224-2.479-.342-4.096-.09-2.634-1.133-5.219-3.255-7.33l-7.228-7.189s-1.424-1.417-2.843.008c-1.417 1.424.008 2.842.008 2.842l3.054 3.039 2.646 2.632s-.71.712-3.639-2.202c-2.931-2.915-9.894-9.845-9.894-9.845s-1.425-1.417-2.843.008c-1.418 1.424.007 2.841.007 2.841l9.356 9.31c-.02-.02-.754.667-.767.654L9.64 4.534s-1.425-1.418-2.843.007c-1.417 1.425.007 2.842.007 2.842l10.011 9.962c.012.012-.68.741-.66.761L7.52 9.513s-1.425-1.417-2.843.008.007 2.843.007 2.843l9.181 9.135c.084.083-.53.891-.425.996l-6.616-6.583s-1.425-1.417-2.843.008.007 2.843.007 2.843l10.79 10.732c1.802 1.793 3.682 2.732 5.974 3.131.467.081 1.067.101 1.311.14.773.124 1.445.423 2.34 1.014 1.15.759 2.902 1.118 3.951.07l3.577-3.576 3.302-3.302c1.049-1.05.9-1.99.157-3.15z"/></svg>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="-10 -10 20 20">
          <g class="sparkle">
          ${arrayOfSize(5)
            .map(s => `<g><circle cx="0" cy="0" r="1"/></g>`)
            .join("")}
          </g>
        </svg>
      </div>
      `;

    this._styleRootElement = this.querySelector(".style-root");
    this._countElement = this.querySelector(".count");
    this._updateRootColor();
    // the number of claps that this user has made - this is limited
    // by the MAX_MULTI_CLAP property, and whether multiclap is enabled
    this._totalClaps = 0;

    let initialClapCountResolve;
    this._initialClapCount = new Promise(
      resolve => (initialClapCountResolve = resolve)
    );

    // buffer claps within a 2 second window
    this._bufferedClaps = 0;
    this._updateClaps = debounce(() => {
      if (this._totalClaps < MAX_MULTI_CLAP) {
        const increment = Math.min(
          this._bufferedClaps,
          MAX_MULTI_CLAP - this._totalClaps
        );
        updateClaps(this.api, increment, this.url);
        this._totalClaps += increment;
        this._bufferedClaps = 0;
      }
    }, 2000);

    this.addEventListener("mousedown", event => {
      if (event.button !== 0) {
        return;
      }

      this.classList.add("clapped");
      if (this.classList.contains("clap-limit-exceeded")) {
        return;
      }

      // fire a DOM event with the updated count
      const clapCount =
        Number(this._countElement.innerHTML.replace(",", "")) + 1;
      this.dispatchEvent(
        new CustomEvent("clapped", {
          bubbles: true,
          detail: {
            clapCount
          }
        })
      );

      // trigger the animation
      toggleClass(this, "clap");

      // buffer the increased count and defer the update
      this._bufferedClaps++;
      this._updateClaps();

      // increment the clap count after a small pause (to allow the animation to run)
      setTimeout(() => {
        this._countElement.innerHTML = formatClaps(clapCount);
      }, 250);

      // check whether we've exceeded the max claps
      if (this.multiclap) {
        if (this._bufferedClaps + this._totalClaps >= MAX_MULTI_CLAP) {
          this.classList.add("clap-limit-exceeded");
        }
      } else {
        this.classList.add("clap-limit-exceeded");
      }
    });

    getClaps(this.api, this.url).then(claps => {
      this.classList.remove("loading");
      const clapCount = Number(claps);
      initialClapCountResolve(clapCount);
      if (clapCount > 0) {
        this._countElement.innerHTML = formatClaps(clapCount);
      }
    });

    this._connected = true;
  }

  get initialClapCount() {
    return this._initialClapCount;
  }

  get color() {
    return this.getAttribute("color");
  }

  set api(api) {
    if (api) {
      this.setAttribute("api", api);
    } else {
      this.removeAttribute("api");
    }
  }

  get api() {
    return this.getAttribute("api") || API;
  }

  set color(color) {
    if (color) {
      this.setAttribute("color", color);
    } else {
      this.removeAttribute("color");
    }
    this._updateRootColor();
  }

  set url(url) {
    if (url) {
      this.setAttribute("url", url);
    } else {
      this.removeAttribute("url");
    }
    this._updateRootColor();
  }

  get url() {
    return this.getAttribute("url");
  }

  get multiclap() {
    return this.getAttribute("multiclap") === "true";
  }

  set multiclap(multiclap) {
    if (multiclap) {
      this.setAttribute("multiclap", multiclap ? "true" : "false");
    } else {
      this.removeAttribute("multiclap");
    }
  }

  static get observedAttributes() {
    return ["color"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    this._updateRootColor();
  }

  // propagates the color property to the various elements
  // that make up the applause button
  _updateRootColor() {
    if (!this._styleRootElement) {
      return;
    }
    const rootColor = this.getAttribute("color") || "green";
    const style = this._styleRootElement.style;
    style.fill = rootColor;
    style.stroke = rootColor;
    style.color = rootColor;
  }
}

customElements.define("applause-button", ApplauseButton);
