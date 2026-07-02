# 3D Animal Model Viewer

This is the first rebuilt stage of the project: a dependency-free browser viewer for animal 3D models.

## How to use

Open `index.html` in a browser, then:

- Click **选择 3D 文件** and select one or more model-related files.
- Or click **选择整个文件夹** and select an OBJ folder containing `.obj`, `.mtl`, and texture images.
- Or drag files/folders into the viewer.

## Supported formats

Current built-in support:

- `.obj` with `.mtl` and diffuse texture images
- `.stl`, binary or ASCII
- `.glb`
- `.gltf` with external `.bin` buffers or embedded data URI buffers

Recognized but not directly loaded yet:

- `.fbx`
- `.usdz`

For FBX and USDZ, use the corresponding OBJ, STL, or GLB export when available.

## Interaction

- Left drag: rotate
- Right drag or Shift + left drag: pan
- Mouse wheel: zoom
- Double click: reset view

## Implementation note

The viewer uses plain WebGL and detailed in-code comments. No third-party 3D library is required for this stage.

