# Wayfinder · waʻa kaulua

An interactive 3D website about Polynesian wayfinding: the art of crossing thousands of kilometers of open ocean with no instruments, no charts and no metal, guided only by stars, swells and birds.

**Live site:** https://aocampo93.github.io/PolynesiansSite/

## Features

- **Hero ocean:** a double-hulled voyaging canoe (waʻa kaulua) floating on an animated low-poly sea with layered waves, drag-to-orbit camera and framed views (full / bow / sail / hull).
- **Anatomy:** a scroll-driven exploded view that takes the canoe apart piece by piece: hulls, iako crossbeams, deck platform, crab-claw rigs and steering paddle.
- **Star compass:** an interactive rose with the 32 houses of the horizon, keyboard-navigable, with per-house reference stars that appear in night mode.
- **Augmented reality:** "view in your space" opens the device camera: on Android, a WebXR session with an aiming ring that tracks the floor and places the canoe at its real 19-meter size on tap; on iPhone and iPad, the same button launches AR Quick Look with a USDZ model.
- **Immersive hall:** a first-person gallery of four voyaging canoes (Hōkūleʻa, Tipairua, Te Aurere, Te Puke). Walk with WASD and pointer lock on desktop, drag-to-look and auto-travel on mobile; standing in a floor circle raises the spotlight over the vessel and opens an information panel with a real photograph and technical data.
- **The crossing:** a playable night voyage on its own page. Hold the guide star over the bow, follow the star path through its handoffs, read the signs of land and make landfall before the drift wins. Keyboard, mouse or touch.
- **Day / night mode:** the whole scene rig (sky, sun, rim light, sea color) switches between navigation conditions, persisted across visits.

## Technologies

| Area | Stack |
|------|-------|
| 3D rendering | [three.js](https://threejs.org/) (WebGL) |
| Models | GLB / glTF with Draco mesh compression, loaded with `GLTFLoader` + `DRACOLoader`, normalized at runtime (orientation, scale, waterline) |
| Procedural geometry | Custom `BufferGeometry` for hulls, sails, rigging and an animated polar-grid ocean |
| Augmented reality | WebXR `immersive-ar` with hit-test and DOM overlay (Android) · AR Quick Look with USDZ (iOS) |
| First-person controls | Pointer Lock API + pointer events (touch look on mobile) |
| UI runtime | Declarative HTML template compiled to React components |
| Styling | Hand-written CSS custom properties, no framework |
| Hosting | GitHub Pages (static, HTTPS) |

Every visual parameter (light types, colors, intensities and positions, wave shapes, camera orbits, hall layout, AR scale) lives in a single documented `CFG` block at the top of [`wayfinder-3d.js`](wayfinder-3d.js), so the scenes can be tuned by editing one file.

## Running locally

It is a fully static site: serve the folder with any web server and open `index.html`.

```bash
# any of these works
python3 -m http.server 8000
npx serve .
```

Note: the WebXR AR mode requires a secure context (HTTPS or `localhost`) and an ARCore-capable Android device with Chrome. On iOS the AR button uses Quick Look instead, which works in Safari and Chrome.

## Photo credits

Vessel photographs via Wikimedia Commons: Hōkūleʻa by Phil Uhl (CC BY-SA 3.0), Faʻafaite by Raivavae (CC BY-SA 4.0), Te Aurere by W. Bulach (CC BY-SA 4.0), tepuke "Maunga Nefe" by Bin im Garten (CC BY-SA 3.0).
