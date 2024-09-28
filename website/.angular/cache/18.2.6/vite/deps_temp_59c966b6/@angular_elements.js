import {
  ApplicationRef,
  ChangeDetectorRef,
  ComponentFactoryResolver$1,
  Injector,
  NgZone,
  ReplaySubject,
  SimpleChange,
  Version,
  map,
  merge,
  switchMap
} from "./chunk-VEJY5LZ3.js";
import "./chunk-WDMUDEB6.js";

// node_modules/@angular/elements/fesm2022/elements.mjs
var scheduler = {
  /**
   * Schedule a callback to be called after some delay.
   *
   * Returns a function that when executed will cancel the scheduled function.
   */
  schedule(taskFn, delay) {
    const id = setTimeout(taskFn, delay);
    return () => clearTimeout(id);
  },
  /**
   * Schedule a callback to be called before the next render.
   * (If `window.requestAnimationFrame()` is not available, use `scheduler.schedule()` instead.)
   *
   * Returns a function that when executed will cancel the scheduled function.
   */
  scheduleBeforeRender(taskFn) {
    if (typeof window === "undefined") {
      return scheduler.schedule(taskFn, 0);
    }
    if (typeof window.requestAnimationFrame === "undefined") {
      const frameMs = 16;
      return scheduler.schedule(taskFn, frameMs);
    }
    const id = window.requestAnimationFrame(taskFn);
    return () => window.cancelAnimationFrame(id);
  }
};
function camelToDashCase(input) {
  return input.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
}
function isElement(node) {
  return !!node && node.nodeType === Node.ELEMENT_NODE;
}
function isFunction(value) {
  return typeof value === "function";
}
var _matches;
function matchesSelector(el, selector) {
  if (!_matches) {
    const elProto = Element.prototype;
    _matches = elProto.matches || elProto.matchesSelector || elProto.mozMatchesSelector || elProto.msMatchesSelector || elProto.oMatchesSelector || elProto.webkitMatchesSelector;
  }
  return el.nodeType === Node.ELEMENT_NODE ? _matches.call(el, selector) : false;
}
function strictEquals(value1, value2) {
  return value1 === value2 || value1 !== value1 && value2 !== value2;
}
function getDefaultAttributeToPropertyInputs(inputs) {
  const attributeToPropertyInputs = {};
  inputs.forEach(({
    propName,
    templateName,
    transform
  }) => {
    attributeToPropertyInputs[camelToDashCase(templateName)] = [propName, transform];
  });
  return attributeToPropertyInputs;
}
function getComponentInputs(component, injector) {
  const componentFactoryResolver = injector.get(ComponentFactoryResolver$1);
  const componentFactory = componentFactoryResolver.resolveComponentFactory(component);
  return componentFactory.inputs;
}
function extractProjectableNodes(host, ngContentSelectors) {
  const nodes = host.childNodes;
  const projectableNodes = ngContentSelectors.map(() => []);
  let wildcardIndex = -1;
  ngContentSelectors.some((selector, i) => {
    if (selector === "*") {
      wildcardIndex = i;
      return true;
    }
    return false;
  });
  for (let i = 0, ii = nodes.length; i < ii; ++i) {
    const node = nodes[i];
    const ngContentIndex = findMatchingIndex(node, ngContentSelectors, wildcardIndex);
    if (ngContentIndex !== -1) {
      projectableNodes[ngContentIndex].push(node);
    }
  }
  return projectableNodes;
}
function findMatchingIndex(node, selectors, defaultIndex) {
  let matchingIndex = defaultIndex;
  if (isElement(node)) {
    selectors.some((selector, i) => {
      if (selector !== "*" && matchesSelector(node, selector)) {
        matchingIndex = i;
        return true;
      }
      return false;
    });
  }
  return matchingIndex;
}
var DESTROY_DELAY = 10;
var ComponentNgElementStrategyFactory = class {
  constructor(component, injector) {
    this.componentFactory = injector.get(ComponentFactoryResolver$1).resolveComponentFactory(component);
  }
  create(injector) {
    return new ComponentNgElementStrategy(this.componentFactory, injector);
  }
};
var ComponentNgElementStrategy = class {
  constructor(componentFactory, injector) {
    this.componentFactory = componentFactory;
    this.injector = injector;
    this.eventEmitters = new ReplaySubject(1);
    this.events = this.eventEmitters.pipe(switchMap((emitters) => merge(...emitters)));
    this.componentRef = null;
    this.viewChangeDetectorRef = null;
    this.inputChanges = null;
    this.hasInputChanges = false;
    this.implementsOnChanges = false;
    this.scheduledChangeDetectionFn = null;
    this.scheduledDestroyFn = null;
    this.initialInputValues = /* @__PURE__ */ new Map();
    this.unchangedInputs = new Set(this.componentFactory.inputs.map(({
      propName
    }) => propName));
    this.ngZone = this.injector.get(NgZone);
    this.elementZone = typeof Zone === "undefined" ? null : this.ngZone.run(() => Zone.current);
  }
  /**
   * Initializes a new component if one has not yet been created and cancels any scheduled
   * destruction.
   */
  connect(element) {
    this.runInZone(() => {
      if (this.scheduledDestroyFn !== null) {
        this.scheduledDestroyFn();
        this.scheduledDestroyFn = null;
        return;
      }
      if (this.componentRef === null) {
        this.initializeComponent(element);
      }
    });
  }
  /**
   * Schedules the component to be destroyed after some small delay in case the element is just
   * being moved across the DOM.
   */
  disconnect() {
    this.runInZone(() => {
      if (this.componentRef === null || this.scheduledDestroyFn !== null) {
        return;
      }
      this.scheduledDestroyFn = scheduler.schedule(() => {
        if (this.componentRef !== null) {
          this.componentRef.destroy();
          this.componentRef = null;
          this.viewChangeDetectorRef = null;
        }
      }, DESTROY_DELAY);
    });
  }
  /**
   * Returns the component property value. If the component has not yet been created, the value is
   * retrieved from the cached initialization values.
   */
  getInputValue(property) {
    return this.runInZone(() => {
      if (this.componentRef === null) {
        return this.initialInputValues.get(property);
      }
      return this.componentRef.instance[property];
    });
  }
  /**
   * Sets the input value for the property. If the component has not yet been created, the value is
   * cached and set when the component is created.
   */
  setInputValue(property, value, transform) {
    this.runInZone(() => {
      if (transform) {
        value = transform.call(this.componentRef?.instance, value);
      }
      if (this.componentRef === null) {
        this.initialInputValues.set(property, value);
        return;
      }
      if (strictEquals(value, this.getInputValue(property)) && !(value === void 0 && this.unchangedInputs.has(property))) {
        return;
      }
      this.recordInputChange(property, value);
      this.unchangedInputs.delete(property);
      this.hasInputChanges = true;
      this.componentRef.instance[property] = value;
      this.scheduleDetectChanges();
    });
  }
  /**
   * Creates a new component through the component factory with the provided element host and
   * sets up its initial inputs, listens for outputs changes, and runs an initial change detection.
   */
  initializeComponent(element) {
    const childInjector = Injector.create({
      providers: [],
      parent: this.injector
    });
    const projectableNodes = extractProjectableNodes(element, this.componentFactory.ngContentSelectors);
    this.componentRef = this.componentFactory.create(childInjector, projectableNodes, element);
    this.viewChangeDetectorRef = this.componentRef.injector.get(ChangeDetectorRef);
    this.implementsOnChanges = isFunction(this.componentRef.instance.ngOnChanges);
    this.initializeInputs();
    this.initializeOutputs(this.componentRef);
    this.detectChanges();
    const applicationRef = this.injector.get(ApplicationRef);
    applicationRef.attachView(this.componentRef.hostView);
  }
  /** Set any stored initial inputs on the component's properties. */
  initializeInputs() {
    this.componentFactory.inputs.forEach(({
      propName,
      transform
    }) => {
      if (this.initialInputValues.has(propName)) {
        this.setInputValue(propName, this.initialInputValues.get(propName), transform);
      }
    });
    this.initialInputValues.clear();
  }
  /** Sets up listeners for the component's outputs so that the events stream emits the events. */
  initializeOutputs(componentRef) {
    const eventEmitters = this.componentFactory.outputs.map(({
      propName,
      templateName
    }) => {
      const emitter = componentRef.instance[propName];
      return emitter.pipe(map((value) => ({
        name: templateName,
        value
      })));
    });
    this.eventEmitters.next(eventEmitters);
  }
  /** Calls ngOnChanges with all the inputs that have changed since the last call. */
  callNgOnChanges(componentRef) {
    if (!this.implementsOnChanges || this.inputChanges === null) {
      return;
    }
    const inputChanges = this.inputChanges;
    this.inputChanges = null;
    componentRef.instance.ngOnChanges(inputChanges);
  }
  /**
   * Marks the component view for check, if necessary.
   * (NOTE: This is required when the `ChangeDetectionStrategy` is set to `OnPush`.)
   */
  markViewForCheck(viewChangeDetectorRef) {
    if (this.hasInputChanges) {
      this.hasInputChanges = false;
      viewChangeDetectorRef.markForCheck();
    }
  }
  /**
   * Schedules change detection to run on the component.
   * Ignores subsequent calls if already scheduled.
   */
  scheduleDetectChanges() {
    if (this.scheduledChangeDetectionFn) {
      return;
    }
    this.scheduledChangeDetectionFn = scheduler.scheduleBeforeRender(() => {
      this.scheduledChangeDetectionFn = null;
      this.detectChanges();
    });
  }
  /**
   * Records input changes so that the component receives SimpleChanges in its onChanges function.
   */
  recordInputChange(property, currentValue) {
    if (!this.implementsOnChanges) {
      return;
    }
    if (this.inputChanges === null) {
      this.inputChanges = {};
    }
    const pendingChange = this.inputChanges[property];
    if (pendingChange) {
      pendingChange.currentValue = currentValue;
      return;
    }
    const isFirstChange = this.unchangedInputs.has(property);
    const previousValue = isFirstChange ? void 0 : this.getInputValue(property);
    this.inputChanges[property] = new SimpleChange(previousValue, currentValue, isFirstChange);
  }
  /** Runs change detection on the component. */
  detectChanges() {
    if (this.componentRef === null) {
      return;
    }
    this.callNgOnChanges(this.componentRef);
    this.markViewForCheck(this.viewChangeDetectorRef);
    this.componentRef.changeDetectorRef.detectChanges();
  }
  /** Runs in the angular zone, if present. */
  runInZone(fn) {
    return this.elementZone && Zone.current !== this.elementZone ? this.ngZone.run(fn) : fn();
  }
};
var NgElement = class extends HTMLElement {
  constructor() {
    super(...arguments);
    this.ngElementEventsSubscription = null;
  }
};
function createCustomElement(component, config) {
  const inputs = getComponentInputs(component, config.injector);
  const strategyFactory = config.strategyFactory || new ComponentNgElementStrategyFactory(component, config.injector);
  const attributeToPropertyInputs = getDefaultAttributeToPropertyInputs(inputs);
  class NgElementImpl extends NgElement {
    static {
      this["observedAttributes"] = Object.keys(attributeToPropertyInputs);
    }
    get ngElementStrategy() {
      if (!this._ngElementStrategy) {
        const strategy = this._ngElementStrategy = strategyFactory.create(this.injector || config.injector);
        inputs.forEach(({
          propName,
          transform
        }) => {
          if (!this.hasOwnProperty(propName)) {
            return;
          }
          const value = this[propName];
          delete this[propName];
          strategy.setInputValue(propName, value, transform);
        });
      }
      return this._ngElementStrategy;
    }
    constructor(injector) {
      super();
      this.injector = injector;
    }
    attributeChangedCallback(attrName, oldValue, newValue, namespace) {
      const [propName, transform] = attributeToPropertyInputs[attrName];
      this.ngElementStrategy.setInputValue(propName, newValue, transform);
    }
    connectedCallback() {
      let subscribedToEvents = false;
      if (this.ngElementStrategy.events) {
        this.subscribeToEvents();
        subscribedToEvents = true;
      }
      this.ngElementStrategy.connect(this);
      if (!subscribedToEvents) {
        this.subscribeToEvents();
      }
    }
    disconnectedCallback() {
      if (this._ngElementStrategy) {
        this._ngElementStrategy.disconnect();
      }
      if (this.ngElementEventsSubscription) {
        this.ngElementEventsSubscription.unsubscribe();
        this.ngElementEventsSubscription = null;
      }
    }
    subscribeToEvents() {
      this.ngElementEventsSubscription = this.ngElementStrategy.events.subscribe((e) => {
        const customEvent = new CustomEvent(e.name, {
          detail: e.value
        });
        this.dispatchEvent(customEvent);
      });
    }
  }
  inputs.forEach(({
    propName,
    transform
  }) => {
    Object.defineProperty(NgElementImpl.prototype, propName, {
      get() {
        return this.ngElementStrategy.getInputValue(propName);
      },
      set(newValue) {
        this.ngElementStrategy.setInputValue(propName, newValue, transform);
      },
      configurable: true,
      enumerable: true
    });
  });
  return NgElementImpl;
}
var VERSION = new Version("18.2.6");
export {
  NgElement,
  VERSION,
  createCustomElement
};
/*! Bundled license information:

@angular/elements/fesm2022/elements.mjs:
  (**
   * @license Angular v18.2.6
   * (c) 2010-2024 Google LLC. https://angular.io/
   * License: MIT
   *)
*/
//# sourceMappingURL=@angular_elements.js.map
