/**
 * [Leaflet.SmoothWheelZoom](https://github.com/mutsuyuki/Leaflet.SmoothWheelZoom)
 * — bundled as ESM with explicit `leaflet` import (upstream assumes global `L`).
 * Forked from photo.feng.works with RAF / pinch-wheel fixes.
 */
import L from 'leaflet';

/** Matches Leaflet `DomEvent.js` wheel pixel normalization. */
function pinchWheelPxFactor() {
  const mac = navigator.platform.indexOf('Mac') === 0;
  const linux = navigator.platform.indexOf('Linux') === 0;
  const chrome = L.Browser.chrome;
  return linux && chrome
    ? window.devicePixelRatio
    : mac
      ? window.devicePixelRatio * 3
      : window.devicePixelRatio > 0
        ? 2 * window.devicePixelRatio
        : 1;
}

/**
 * Trackpad pinch-zoom uses ctrl/cmd + wheel; browsers often set both `deltaX` and `deltaY`.
 * Leaflet's `getWheelDelta` returns 0 whenever `deltaX` is set (meant to ignore horizontal pan),
 * which disables pinch. For gesture-zoom wheel events, use vertical delta only.
 */
function wheelDeltaForSmoothZoom(e) {
  const d = L.DomEvent.getWheelDelta(e);
  if (
    d !== 0 ||
    !(e.ctrlKey || e.metaKey) ||
    e.deltaMode !== 0 ||
    e.deltaY === 0
  ) {
    return d;
  }
  return -e.deltaY / pinchWheelPxFactor();
}

L.Map.mergeOptions({
  smoothWheelZoom: true,
  smoothSensitivity: 1,
});

L.Map.SmoothWheelZoom = L.Handler.extend({
  addHooks() {
    L.DomEvent.on(this._map._container, 'wheel', this._onWheelScroll, this);
  },

  removeHooks() {
    L.DomEvent.off(this._map._container, 'wheel', this._onWheelScroll, this);
  },

  _onWheelScroll(e) {
    if (!this._isWheeling) {
      this._onWheelStart(e);
    }
    this._onWheeling(e);
  },

  _onWheelStart(e) {
    const map = this._map;
    this._isWheeling = true;
    this._wheelMousePosition = map.mouseEventToContainerPoint(e);
    this._centerPoint = map.getSize().divideBy(2);
    this._startLatLng = map.containerPointToLatLng(this._centerPoint);
    this._wheelMouseLatLng = map.containerPointToLatLng(this._wheelMousePosition);
    this._moved = false;

    map.stop();
    if (map._panAnim) map._panAnim.stop();

    this._goalZoom = map.getZoom();

    this._zoomAnimationId = requestAnimationFrame(
      this._updateWheelZoom.bind(this),
    );
  },

  _onWheeling(e) {
    const map = this._map;

    this._goalZoom +=
      wheelDeltaForSmoothZoom(e) * 0.003 * map.options.smoothSensitivity;
    if (this._goalZoom < map.getMinZoom() || this._goalZoom > map.getMaxZoom()) {
      this._goalZoom = map._limitZoom(this._goalZoom);
    }
    this._wheelMousePosition = this._map.mouseEventToContainerPoint(e);
    this._wheelMouseLatLng = map.containerPointToLatLng(this._wheelMousePosition);

    window.clearTimeout(this._timeoutId);
    this._timeoutId = window.setTimeout(this._onWheelEnd.bind(this), 200);

    L.DomEvent.preventDefault(e);
    L.DomEvent.stopPropagation(e);
  },

  _onWheelEnd() {
    this._isWheeling = false;
    cancelAnimationFrame(this._zoomAnimationId);
    this._map._moveEnd(true);
  },

  _updateWheelZoom() {
    const map = this._map;

    // Keep the RAF chain alive for the whole gesture. Upstream returned early when
    // getCenter/getZoom didn't match _prev* (float noise) or cursor sat on center —
    // without scheduling another frame, zoom felt like it "cut out".
    try {
      const zoom =
        map.getZoom() + (this._goalZoom - map.getZoom()) * 0.3;

      const delta = this._wheelMousePosition.subtract(this._centerPoint);

      let center;
      if (map.options.smoothWheelZoom === 'center') {
        center = this._startLatLng;
      } else if (delta.x === 0 && delta.y === 0) {
        center = map.getCenter();
      } else {
        center = map.unproject(
          map.project(this._wheelMouseLatLng, zoom).subtract(delta),
          zoom,
        );
      }

      if (!this._moved) {
        map._moveStart(true, false);
        this._moved = true;
      }

      map._move(center, zoom);
    } finally {
      if (this._isWheeling) {
        this._zoomAnimationId = requestAnimationFrame(
          this._updateWheelZoom.bind(this),
        );
      }
    }
  },
});

L.Map.addInitHook('addHandler', 'smoothWheelZoom', L.Map.SmoothWheelZoom);
