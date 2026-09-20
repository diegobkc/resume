import bpy
import sys

argv = sys.argv[sys.argv.index("--") + 1:]
input_path, output_path = argv[0], argv[1]
target_tris = 30000
max_texture_dim = 1024

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=input_path)

mesh_objects = [o for o in bpy.context.scene.objects if o.type == "MESH"]
total_tris = sum(len(o.data.polygons) for o in mesh_objects)
ratio = min(1.0, target_tris / max(total_tris, 1))
print("TOTAL_TRIS_BEFORE", total_tris, "RATIO", ratio)

for obj in mesh_objects:
    bpy.context.view_layer.objects.active = obj
    mod = obj.modifiers.new(name="Decimate", type="DECIMATE")
    mod.ratio = ratio
    bpy.ops.object.modifier_apply(modifier=mod.name)

total_tris_after = sum(len(o.data.polygons) for o in mesh_objects)
print("TOTAL_TRIS_AFTER", total_tris_after)

for image in bpy.data.images:
    w, h = image.size
    if w > max_texture_dim or h > max_texture_dim:
        scale = max_texture_dim / max(w, h)
        image.scale(max(1, int(w * scale)), max(1, int(h * scale)))
        print("RESCALED_IMAGE", image.name, image.size[0], image.size[1])

bpy.ops.export_scene.gltf(
    filepath=output_path,
    export_format="GLB",
    export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=6,
    export_image_format="WEBP",
    export_image_quality=80,
)

print("EXPORT_DONE", output_path)
