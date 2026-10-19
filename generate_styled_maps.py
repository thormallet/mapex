"""
MAPEX Stylized Cartography Generator - Final High-Fidelity Revision
Strictly adheres to base maps (107937, 107938, 107944) with full internal sea (mar interno)
fidelity, accurate mountain chains, correctly placed forest enclaves, and clean typography.
"""

import os
import math
import json
import cv2
import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import distance_transform_edt, gaussian_filter

ASSETS_DIR = 'assets'
OUTPUT_DIR = os.path.join(ASSETS_DIR, 'styled_maps')
os.makedirs(OUTPUT_DIR, exist_ok=True)

# 1. Extraction of pure contours from 107944
im44 = cv2.imread('assets/base_maps/107944.jpg')
im44 = cv2.resize(im44, (1000, 700))
gray44 = cv2.cvtColor(im44, cv2.COLOR_BGR2GRAY)
bg44 = cv2.GaussianBlur(gray44, (51, 51), 0)
norm44 = gray44.astype(float) / (bg44.astype(float) + 1e-5)

ink44 = (norm44 < 0.78).astype(np.uint8) * 255
ink44[:40, :] = 0; ink44[675:, :] = 0; ink44[:, :50] = 0; ink44[:, 970:] = 0

dil = cv2.dilate(ink44, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)), iterations=1)
open_space = cv2.bitwise_not(dil)

# Flood fill Ocean from (10, 10)
flood_mask = np.zeros((702, 1002), dtype=np.uint8)
cv2.floodFill(open_space, flood_mask, (10, 10), 0)

# Flood fill Inland Sea (Mar Interno) from (370, 360) as WATER!
cv2.floodFill(open_space, flood_mask, (370, 360), 0)

# land_mask is True for land, False for Ocean and Inland Sea
land_mask = (open_space > 0)

# Distance transform in water (Ocean + Inland Sea)
dist_ocean = distance_transform_edt(~land_mask)
# Distance transform in land
dist_land = distance_transform_edt(land_mask)

# Load layers data
with open('src/data/world_layers.json', 'r', encoding='utf-8') as f:
    world_data = json.load(f)

# Mountain chains definitions (primary + secondary from 107937)
mountain_chains = [
    # Grande Cordilheira Meridional (K-E-J / C)
    [[285, 545], [360, 515], [440, 480], [510, 410], [585, 365], [665, 345], [755, 345], [845, 355]],
    # Cadeia Boreal-Oriental (J / A)
    [[675, 135], [690, 205], [705, 275], [715, 340]],
    # Serra Ocidental (H / K-L)
    [[245, 275], [295, 215], [360, 185], [405, 165]],
    # Espinhaço Austral (D / F-A)
    [[485, 575], [565, 515], [655, 465], [745, 415], [810, 385]],
    # Cristas Peninsulares em C
    [[280, 580], [315, 615], [350, 605], [385, 590]],
    # Cadeia Oriental de A
    [[850, 360], [890, 410], [880, 450]],
    # Picos Boreais de J
    [[680, 140], [720, 160], [740, 185]],
    # Cristas Austrais em F
    [[500, 670], [540, 640], [610, 610]],
    # Anel montanhoso do enclave florestal de F
    [[770, 560], [810, 570], [825, 615], [810, 655], [770, 640]]
]

# Rivers definitions
rivers = [
    # Rio Grande do Golfo de K (flows into Mar Interno)
    [[445, 355], [420, 385], [395, 405]],
    # Sistema Fluvial da Bacia E
    [[545, 235], [555, 285], [550, 335], [510, 395], [480, 455]],
    # Rio Trans-Oriental (J para A)
    [[605, 250], [665, 260], [725, 235], [765, 205]],
    # Rio Austral de F
    [[695, 485], [710, 555], [725, 625]],
    # Tributário Boreal
    [[460, 180], [445, 210], [435, 240]],
    # Tributário Sul de E
    [[580, 320], [550, 335]],
    # Rio do Sul de F
    [[605, 535], [620, 585], [635, 630]]
]

# Forest basins exactly calibrated from 107937
forest_basins = [
    # Grande Bacia E
    [[500, 195], [565, 180], [595, 205], [590, 265], [615, 305], [585, 360], [550, 410], [520, 400], [500, 340], [530, 270], [495, 230]],
    # Enclave Noroeste (entre H e L, north of Mar Interno)
    [[365, 205], [410, 205], [445, 260], [460, 310], [435, 325], [395, 270], [365, 225]],
    # Enclave Austral Pequeno (F)
    [[645, 610], [675, 605], [685, 625], [670, 645], [640, 635]],
    # Enclave Austral Grande (F)
    [[775, 560], [815, 570], [825, 615], [820, 660], [785, 670], [770, 645], [765, 595]]
]

def draw_compass_rose(draw, cx, cy, radius=48):
    """Draws an authentic, ornate 16-point nautical compass rose."""
    draw.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], outline=(180, 150, 100), width=2)
    draw.ellipse([cx - radius + 4, cy - radius + 4, cx + radius - 4, cy + radius - 4], outline=(140, 115, 75), width=1)
    draw.ellipse([cx - radius + 10, cy - radius + 10, cx + radius - 10, cy + radius - 10], outline=(180, 150, 100), width=1)
    
    cardinals = [(0, -radius - 6), (radius + 6, 0), (0, radius + 6), (-radius - 6, 0)]
    intercardinals = [
        (radius * 0.7, -radius * 0.7),
        (radius * 0.7, radius * 0.7),
        (-radius * 0.7, radius * 0.7),
        (-radius * 0.7, -radius * 0.7)
    ]
    
    for i in range(4):
        tip_x = cx + cardinals[i][0]
        tip_y = cy + cardinals[i][1]
        next_i = (i + 1) % 4
        base1_x = cx + cardinals[next_i][0] * 0.22
        base1_y = cy + cardinals[next_i][1] * 0.22
        prev_i = (i - 1) % 4
        base2_x = cx + cardinals[prev_i][0] * 0.22
        base2_y = cy + cardinals[prev_i][1] * 0.22
        
        draw.polygon([(cx, cy), (tip_x, tip_y), (base1_x, base1_y)], fill=(235, 195, 110), outline=(130, 95, 45))
        draw.polygon([(cx, cy), (tip_x, tip_y), (base2_x, base2_y)], fill=(160, 115, 55), outline=(130, 95, 45))
        
    for i in range(4):
        tip_x = cx + intercardinals[i][0] * 0.78
        tip_y = cy + intercardinals[i][1] * 0.78
        base_x = cx + cardinals[i][0] * 0.16
        base_y = cy + cardinals[i][1] * 0.16
        draw.polygon([(cx, cy), (tip_x, tip_y), (base_x, base_y)], fill=(190, 145, 80), outline=(130, 95, 45))

    draw.ellipse([cx - 6, cy - 6, cx + 6, cy + 6], fill=(245, 215, 130), outline=(110, 75, 30), width=2)
    draw.ellipse([cx - 2, cy - 2, cx + 2, cy + 2], fill=(130, 45, 30))
    draw.text((cx - 4, cy - radius - 20), "N", fill=(160, 110, 40))

def draw_rhumb_lines(draw, nodes, w=1000, h=700):
    """Draws nautical navigation rhumb lines connecting key sea nodes."""
    for n1 in nodes:
        for angle in range(0, 360, 45):
            rad = math.radians(angle)
            end_x = n1[0] + math.cos(rad) * 900
            end_y = n1[1] + math.sin(rad) * 900
            draw.line([n1, (end_x, end_y)], fill=(190, 175, 145, 45), width=1)

def draw_cartographic_border(draw, w=1000, h=700):
    """Draws a master double neatline border with brass corner brackets."""
    m = 10
    draw.rectangle([m, m, w - m, h - m], outline=(70, 50, 30), width=3)
    draw.rectangle([m + 4, m + 4, w - m - 4, h - m - 4], outline=(200, 175, 125), width=2)
    draw.rectangle([m + 8, m + 8, w - m - 8, h - m - 8], outline=(110, 80, 50), width=1)
    
    for cx, cy in [(m + 4, m + 4), (w - m - 4, m + 4), (m + 4, h - m - 4), (w - m - 4, h - m - 4)]:
        draw.rectangle([cx - 7, cy - 7, cx + 7, cy + 7], fill=(225, 190, 115), outline=(90, 65, 35), width=1)
        draw.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=(120, 80, 40))

def draw_scale_bar(draw, x=50, y=660, km=250, px_width=85):
    """Draws official scale bar (250 km) calibrated to original map."""
    h = 7
    draw.rectangle([x - 6, y - 16, x + px_width + 45, y + 12], fill=(245, 235, 215, 230), outline=(130, 95, 55), width=1)
    draw.text((x, y - 14), f"Escala: {km} km", fill=(70, 45, 20))
    seg = px_width // 2
    draw.rectangle([x, y, x + seg, y + h], fill=(60, 40, 20), outline=(40, 25, 10))
    draw.rectangle([x + seg, y, x + px_width, y + h], fill=(245, 240, 225), outline=(40, 25, 10))
    draw.line([(x, y - 2), (x, y + h + 2)], fill=(40, 25, 10), width=1)
    draw.line([(x + seg, y - 2), (x + seg, y + h + 2)], fill=(40, 25, 10), width=1)
    draw.line([(x + px_width, y - 2), (x + px_width, y + h + 2)], fill=(40, 25, 10), width=1)
    draw.text((x - 2, y + h + 1), "0", fill=(70, 45, 20))
    draw.text((x + seg - 7, y + h + 1), f"{km//2}", fill=(70, 45, 20))
    draw.text((x + px_width - 7, y + h + 1), f"{km}", fill=(70, 45, 20))

def draw_title_cartouche(draw, text="MAPEX - KOSMOS CARTOGRAFICO", x=500, y=28):
    """Draws clean title banner without encoding artifacts."""
    box_w = 320
    box_h = 22
    bx = x - box_w // 2
    draw.rectangle([bx, y, bx + box_w, y + box_h], fill=(248, 240, 225, 240), outline=(130, 95, 55), width=2)
    draw.rectangle([bx + 3, y + 3, bx + box_w - 3, y + box_h - 3], outline=(205, 175, 120), width=1)
    draw.text((bx + 28, y + 4), text, fill=(80, 50, 25))

def render_mountain_peaks(draw, chain, peak_spacing=18, peak_height=14):
    """Draws authentic hand-drawn / engraved shaded mountain peaks along a ridge."""
    pts = np.array(chain, dtype=float)
    total_len = 0
    lens = []
    for i in range(len(pts) - 1):
        l = np.linalg.norm(pts[i+1] - pts[i])
        lens.append(l)
        total_len += l
    
    num_peaks = max(2, int(total_len // peak_spacing))
    step = total_len / num_peaks
    
    seg_idx = 0
    accum_dist = 0
    
    for p in range(num_peaks + 1):
        target_d = p * step
        while seg_idx < len(lens) - 1 and target_d > accum_dist + lens[seg_idx]:
            accum_dist += lens[seg_idx]
            seg_idx += 1
        t = (target_d - accum_dist) / max(1e-4, lens[seg_idx])
        cx, cy = pts[seg_idx] + t * (pts[seg_idx+1] - pts[seg_idx])
        
        ix = int(np.clip(cx, 0, 999))
        iy = int(np.clip(cy, 0, 699))
        # Ensure peak is on land
        if not land_mask[iy, ix] or dist_land[iy, ix] < 1.5:
            continue
            
        jitter_x = (np.sin(p * 3.7) * 3)
        jitter_y = (np.cos(p * 2.3) * 3)
        mx = cx + jitter_x
        my = cy + jitter_y
        
        ph = peak_height + np.sin(p * 5.1) * 3
        half_w = ph * 0.95
        
        peak_top = (mx, my - ph)
        base_left = (mx - half_w, my + ph * 0.25)
        base_mid = (mx + half_w * 0.15, my + ph * 0.3)
        base_right = (mx + half_w, my + ph * 0.25)
        
        # Lit NW flank
        draw.polygon([peak_top, base_left, base_mid], fill=(245, 235, 210), outline=(85, 55, 30))
        # Shaded SE flank
        draw.polygon([peak_top, base_mid, base_right], fill=(175, 140, 105), outline=(85, 55, 30))
        # Ridge spine
        draw.line([peak_top, base_mid], fill=(60, 35, 15), width=2)
        
        for h_step in [0.35, 0.65]:
            hx = peak_top[0] + (base_right[0] - peak_top[0]) * h_step
            hy = peak_top[1] + (base_right[1] - peak_top[1]) * h_step
            draw.line([(hx, hy), (hx - 3, hy + 2)], fill=(120, 90, 60), width=1)

def generate_physical_map():
    print("Generating Mapex Physical Classic Map (with Mar Interno & Mountain Peaks)...")
    y, x = np.ogrid[:700, :1000]
    rad = np.sqrt(((x - 500)/500)**2 + ((y - 350)/350)**2)
    
    # 1. Base Water (Ocean + Mar Interno)
    ocean_b = 208 - 25 * np.clip(dist_ocean / 120.0, 0, 1) - 15 * rad
    ocean_g = 198 - 25 * np.clip(dist_ocean / 120.0, 0, 1) - 15 * rad
    ocean_r = 175 - 30 * np.clip(dist_ocean / 120.0, 0, 1) - 20 * rad

    canvas = np.zeros((700, 1000, 3), dtype=np.float32)
    canvas[:, :, 0] = np.clip(ocean_b, 130, 245)
    canvas[:, :, 1] = np.clip(ocean_g, 155, 245)
    canvas[:, :, 2] = np.clip(ocean_r, 140, 240)

    # 2. Shallow water shelf glow (both in ocean and in mar interno)
    shelf_factor = np.exp(-dist_ocean / 14.0)
    canvas[:, :, 0] += shelf_factor * 25
    canvas[:, :, 1] += shelf_factor * 30
    canvas[:, :, 2] += shelf_factor * 35

    # 3. Concentric coastal ripple waves
    wave_mask = np.zeros((700, 1000), dtype=bool)
    for wd in [4, 9, 16, 25]:
        w_band = (dist_ocean >= wd - 0.7) & (dist_ocean <= wd + 0.7)
        wave_mask |= w_band

    canvas[wave_mask, 0] = np.clip(canvas[wave_mask, 0] - 35, 0, 255)
    canvas[wave_mask, 1] = np.clip(canvas[wave_mask, 1] - 30, 0, 255)
    canvas[wave_mask, 2] = np.clip(canvas[wave_mask, 2] - 25, 0, 255)

    # 4. Land (Warm antique parchment/vellum)
    land_b = 216 - 15 * np.exp(-dist_land / 6.0)
    land_g = 234 - 15 * np.exp(-dist_land / 6.0)
    land_r = 244 - 10 * np.exp(-dist_land / 6.0)

    canvas[land_mask, 0] = land_b[land_mask]
    canvas[land_mask, 1] = land_g[land_mask]
    canvas[land_mask, 2] = land_r[land_mask]

    # 5. Coastline ink (sepia/dark ink stroke along all coasts, including mar interno)
    coast_stroke = (dist_ocean < 1.4) & (dist_land < 1.8)
    canvas[coast_stroke, 0] = 25
    canvas[coast_stroke, 1] = 35
    canvas[coast_stroke, 2] = 45

    # Convert to PIL Image
    rgb_arr = cv2.cvtColor(np.clip(canvas, 0, 255).astype(np.uint8), cv2.COLOR_BGR2RGB)
    pil_im = Image.fromarray(rgb_arr)
    draw = ImageDraw.Draw(pil_im, "RGBA")

    # Rhumb navigation lines in open seas
    sea_nodes = [(125, 520), (510, 100), (920, 280), (320, 660)]
    draw_rhumb_lines(draw, sea_nodes)

    # Render Forest Basins
    for b_pts in forest_basins:
        poly = [tuple(p) for p in b_pts]
        draw.polygon(poly, fill=(55, 120, 85, 95), outline=(30, 75, 45, 210))
        for i in range(len(b_pts)):
            p1 = b_pts[i]
            p2 = b_pts[(i + 1) % len(b_pts)]
            mid_x = (p1[0] + p2[0]) / 2.0
            mid_y = (p1[1] + p2[1]) / 2.0
            draw.ellipse([mid_x - 3, mid_y - 3, mid_x + 3, mid_y + 3], fill=(40, 95, 60, 180))

    # Render Rivers
    for riv in rivers:
        pts = [tuple(p) for p in riv]
        draw.line(pts, fill=(3, 105, 161, 140), width=4)
        draw.line(pts, fill=(14, 165, 233, 240), width=2)
        draw.ellipse([pts[0][0] - 2, pts[0][1] - 2, pts[0][0] + 2, pts[0][1] + 2], fill=(2, 132, 199, 255))

    # Render Mountain Chains (Orography)
    for chain in mountain_chains:
        render_mountain_peaks(draw, chain, peak_spacing=17, peak_height=14)

    # Compass Rose in western sea
    draw_compass_rose(draw, 125, 520, radius=48)

    # Elegant Label for Mar Interno
    draw.text((345, 385), "MAR INTERNO", fill=(60, 95, 120, 190))
    draw.text((362, 397), "DE K", fill=(60, 95, 120, 190))

    # Cartographic double neatline border
    draw_cartographic_border(draw)

    # Scale bar
    draw_scale_bar(draw, x=50, y=660, km=250)

    # Title Cartouche (ASCII safe)
    draw_title_cartouche(draw, text="MAPEX - KOSMOS CARTOGRAFICO", x=500, y=26)

    out_path = os.path.join(OUTPUT_DIR, 'mapex_kosmos_physical.png')
    pil_im.save(out_path, quality=95)
    print(f"Saved physical map to {out_path}")
    return pil_im

def generate_political_map():
    print("Generating Mapex Political & Macrolanguages Map...")
    phys_path = os.path.join(OUTPUT_DIR, 'mapex_kosmos_physical.png')
    base_im = Image.open(phys_path).convert('RGBA')
    overlay = Image.new('RGBA', base_im.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    macrolangs = world_data['layers'].get('macrolanguages', [])
    for lang in macrolangs:
        color_hex = lang.get('color', '#fbbf24')
        r = int(color_hex[1:3], 16)
        g = int(color_hex[3:5], 16)
        b = int(color_hex[5:7], 16)
        is_hybrid = lang.get('isHybrid', False)
        alpha = 85 if not is_hybrid else 115
        
        for c in lang.get('centers', []):
            radius = 38 if not is_hybrid else 26
            draw.ellipse([c[0] - radius, c[1] - radius, c[0] + radius, c[1] + radius], 
                         fill=(r, g, b, alpha), 
                         outline=(r, g, b, 210), 
                         width=2)
            draw.ellipse([c[0] - 14, c[1] - 14, c[0] + 14, c[1] + 14], 
                         fill=(250, 245, 235, 235), 
                         outline=(50, 35, 20, 220), 
                         width=2)
            draw.text((c[0] - 5, c[1] - 7), lang['code'], fill=(30, 20, 10, 255))

    combined = Image.alpha_composite(base_im, overlay)
    
    draw_comb = ImageDraw.Draw(combined)
    box_w = 340
    box_h = 22
    bx = 500 - box_w // 2
    by = 26
    draw_comb.rectangle([bx, by, bx + box_w, by + box_h], fill=(248, 240, 225, 245), outline=(130, 95, 55), width=2)
    draw_comb.rectangle([bx + 3, by + 3, bx + box_w - 3, by + box_h - 3], outline=(205, 175, 120), width=1)
    draw_comb.text((bx + 18, by + 4), "MAPEX - MACROLINGUAS E REINOS (A-M)", fill=(80, 50, 25))

    out_path = os.path.join(OUTPUT_DIR, 'mapex_kosmos_political.png')
    combined.convert('RGB').save(out_path, quality=95)
    print(f"Saved political map to {out_path}")

def generate_dark_map():
    print("Generating Mapex Dark GIS Map...")
    y, x = np.ogrid[:700, :1000]
    rad = np.sqrt(((x - 500)/500)**2 + ((y - 350)/350)**2)

    canvas = np.zeros((700, 1000, 3), dtype=np.float32)
    canvas[:, :, 0] = np.clip(28 - 10 * rad, 12, 35) # B
    canvas[:, :, 1] = np.clip(20 - 8 * rad, 10, 26)  # G
    canvas[:, :, 2] = np.clip(14 - 6 * rad, 7, 18)   # R

    shelf_factor = np.exp(-dist_ocean / 16.0)
    canvas[:, :, 0] += shelf_factor * 85
    canvas[:, :, 1] += shelf_factor * 60
    canvas[:, :, 2] += shelf_factor * 15

    for wd in [5, 12, 20, 30]:
        w_band = (dist_ocean >= wd - 0.7) & (dist_ocean <= wd + 0.7)
        canvas[w_band, 0] = np.clip(canvas[w_band, 0] + 55, 0, 255)
        canvas[w_band, 1] = np.clip(canvas[w_band, 1] + 40, 0, 255)
        canvas[w_band, 2] = np.clip(canvas[w_band, 2] + 10, 0, 255)

    canvas[land_mask, 0] = 52 - 15 * np.exp(-dist_land[land_mask] / 8.0)
    canvas[land_mask, 1] = 42 - 12 * np.exp(-dist_land[land_mask] / 8.0)
    canvas[land_mask, 2] = 34 - 10 * np.exp(-dist_land[land_mask] / 8.0)

    coast_stroke = (dist_ocean < 1.4) & (dist_land < 1.8)
    canvas[coast_stroke, 0] = 248
    canvas[coast_stroke, 1] = 189
    canvas[coast_stroke, 2] = 56

    rgb_arr = cv2.cvtColor(np.clip(canvas, 0, 255).astype(np.uint8), cv2.COLOR_BGR2RGB)
    pil_im = Image.fromarray(rgb_arr)
    draw = ImageDraw.Draw(pil_im, "RGBA")

    for riv in rivers:
        pts = [tuple(p) for p in riv]
        draw.line(pts, fill=(56, 189, 248, 160), width=4)
        draw.line(pts, fill=(224, 242, 254, 255), width=2)

    for chain in mountain_chains:
        pts = [tuple(p) for p in chain if land_mask[int(np.clip(p[1],0,699)), int(np.clip(p[0],0,999))]]
        if len(pts) >= 2:
            draw.line(pts, fill=(234, 179, 8, 120), width=5)
            draw.line(pts, fill=(254, 240, 138, 240), width=2)

    for b_pts in forest_basins:
        poly = [tuple(p) for p in b_pts]
        draw.polygon(poly, fill=(16, 185, 129, 65), outline=(52, 211, 153, 200), width=2)

    draw.text((345, 385), "MAR INTERNO", fill=(56, 189, 248, 180))

    m = 10
    draw.rectangle([m, m, 1000 - m, 700 - m], outline=(56, 189, 248), width=2)
    draw.rectangle([m + 4, m + 4, 1000 - m - 4, 700 - m - 4], outline=(234, 179, 8, 140), width=1)

    out_path = os.path.join(OUTPUT_DIR, 'mapex_kosmos_dark.png')
    pil_im.save(out_path, quality=95)
    print(f"Saved dark map to {out_path}")

def generate_heightmap():
    print("Generating High-Resolution Orographic Heightmap for Three.js...")
    hmap = np.zeros((700, 1000), dtype=np.float32)
    
    hmap[land_mask] = 28.0 + 8.0 * np.clip(dist_land[land_mask] / 15.0, 0, 1)

    canvas_mnt = np.zeros((700, 1000), dtype=np.float32)
    for chain in mountain_chains:
        pts = np.array(chain, dtype=np.int32)
        cv2.polylines(canvas_mnt, [pts], isClosed=False, color=190.0, thickness=16, lineType=cv2.LINE_AA)
        cv2.polylines(canvas_mnt, [pts], isClosed=False, color=255.0, thickness=4, lineType=cv2.LINE_AA)

    elev_blur = cv2.GaussianBlur(canvas_mnt, (35, 35), 0)
    
    hmap[land_mask] += elev_blur[land_mask]
    hmap[~land_mask] = 0 # Ocean and Mar Interno flat at water level!

    hmap_uint8 = np.clip(hmap, 0, 255).astype(np.uint8)
    out_path = os.path.join(OUTPUT_DIR, 'mapex_heightmap.png')
    cv2.imwrite(out_path, hmap_uint8)
    print(f"Saved heightmap to {out_path}")

if __name__ == '__main__':
    generate_physical_map()
    generate_political_map()
    generate_dark_map()
    generate_heightmap()
    print("All stylized maps successfully generated with Mar Interno!")
