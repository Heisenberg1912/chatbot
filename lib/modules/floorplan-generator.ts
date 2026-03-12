import { generateText, generateImage } from '../gemini';

const SYSTEM_INSTRUCTION = `You are VitruviAI, an expert AI architect specializing in generating detailed 2D floor plans.
When given a building description, you produce accurate architectural layouts with:
- Room dimensions and positions using polygon points (in pixels, scale: 12px = 1 foot)
- Proper room adjacency and wall alignment
- Furniture placement inside rooms
- Material recommendations

Follow standard architectural practices and building codes.
Prioritize functional space planning, natural light, and ventilation.`;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Point {
  x: number;
  y: number;
}

export interface FurniturePlacement {
  type: string;
  position: Point;
  rotation: number;
  variant?: string;
}

export interface MaterialSpec {
  floor: string;
  wall: string;
}

export interface Room {
  id: string;
  name: string;
  type: string;
  points: Point[];
  area: number;
  furniture: FurniturePlacement[];
  materials: MaterialSpec;
}

export interface Wall {
  id: string;
  start: Point;
  end: Point;
  thickness: number;
}

export interface Door {
  id: string;
  position: Point;
  width: number;
  rotation: number;
  type: 'single' | 'double' | 'sliding';
  connects?: [string, string];
}

export interface Window {
  id: string;
  position: Point;
  width: number;
  rotation: number;
  type: 'single' | 'double' | 'bay';
  roomId?: string;
}

export interface FloorPlan {
  title: string;
  totalArea: string;
  rooms: Room[];
  walls: Wall[];
  doors: Door[];
  windows: Window[];
  summary: string;
  materials: string[];
  estimatedCost: string;
  floorPlanImage?: string; // base64 data URI of AI-generated floor plan image
}

// ─── Room Colors ─────────────────────────────────────────────────────────────

const ROOM_COLORS: Record<string, string> = {
  living: '#c8e6c9',
  bedroom: '#e8d5f5',
  bathroom: '#b3e0f2',
  kitchen: '#ffe0b2',
  dining: '#fff9c4',
  balcony: '#d7ccc8',
  study: '#f0e6ff',
  work: '#f0e6ff',
  garage: '#cfd8dc',
  utility: '#f5f5f5',
  hall: '#e0e0e0',
  entry: '#e0e0e0',
  hallway: '#e0e0e0',
  circulation: '#e0e0e0',
  puja: '#fff3e0',
  store: '#efebe9',
  default: '#e8eaf6',
};

export function getRoomColor(type: string): string {
  const key = type.toLowerCase();
  for (const [k, v] of Object.entries(ROOM_COLORS)) {
    if (key.includes(k)) return v;
  }
  return ROOM_COLORS.default;
}

// ─── Furniture Defaults ──────────────────────────────────────────────────────

const FURNITURE_BY_ROOM: Record<string, string[]> = {
  living: ['sofa', 'coffee-table', 'tv-stand', 'armchair', 'floor-lamp', 'plant'],
  bedroom: ['bed', 'nightstand', 'dresser', 'wardrobe', 'floor-lamp'],
  kitchen: ['counter', 'stove', 'refrigerator', 'island', 'sink'],
  bathroom: ['toilet', 'sink', 'bathtub', 'shower'],
  dining: ['dining-table', 'chairs', 'sideboard'],
  work: ['desk', 'office-chair', 'bookshelf'],
  study: ['desk', 'office-chair', 'bookshelf'],
  entry: ['console-table', 'coat-rack', 'mirror'],
  hallway: ['console-table', 'plant'],
  circulation: [],
};

// ─── Polygon Area ────────────────────────────────────────────────────────────

function calculatePolygonArea(points: Point[]): number {
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  area = Math.abs(area) / 2;
  return Math.round(area / 144); // 12px = 1ft => 144px² = 1ft²
}

// ─── Default Furniture ───────────────────────────────────────────────────────

function generateDefaultFurniture(room: Room): FurniturePlacement[] {
  const { type, points } = room;
  if (!points || points.length < 3) return [];

  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const roomWidth = maxX - minX;

  const furniture: FurniturePlacement[] = [];

  switch (type) {
    case 'living':
      furniture.push(
        { type: 'sofa', position: { x: centerX, y: maxY - 50 }, rotation: 180 },
        { type: 'coffee-table', position: { x: centerX, y: centerY }, rotation: 0 },
        { type: 'tv-stand', position: { x: centerX, y: minY + 40 }, rotation: 0 }
      );
      if (roomWidth > 200) {
        furniture.push({ type: 'floor-lamp', position: { x: maxX - 30, y: maxY - 30 }, rotation: 0 });
      }
      break;
    case 'bedroom':
      furniture.push(
        { type: 'bed', position: { x: centerX, y: centerY - 20 }, rotation: 0 },
        { type: 'nightstand', position: { x: centerX - 60, y: centerY - 40 }, rotation: 0 }
      );
      if (roomWidth > 150) {
        furniture.push({ type: 'nightstand', position: { x: centerX + 60, y: centerY - 40 }, rotation: 0 });
      }
      break;
    case 'kitchen':
      furniture.push(
        { type: 'counter', position: { x: centerX, y: minY + 30 }, rotation: 0 },
        { type: 'stove', position: { x: maxX - 40, y: minY + 30 }, rotation: 0 },
        { type: 'refrigerator', position: { x: minX + 35, y: minY + 35 }, rotation: 0 }
      );
      break;
    case 'bathroom':
      furniture.push(
        { type: 'toilet', position: { x: minX + 30, y: minY + 30 }, rotation: 0 },
        { type: 'sink', position: { x: centerX, y: minY + 30 }, rotation: 0 }
      );
      break;
    case 'dining':
      furniture.push(
        { type: 'dining-table', position: { x: centerX, y: centerY }, rotation: 0 },
        { type: 'chairs', position: { x: centerX, y: centerY }, rotation: 0 }
      );
      break;
    case 'work':
    case 'study':
      furniture.push(
        { type: 'desk', position: { x: centerX, y: minY + 50 }, rotation: 0 },
        { type: 'office-chair', position: { x: centerX, y: minY + 80 }, rotation: 0 }
      );
      break;
    case 'entry':
      furniture.push(
        { type: 'console-table', position: { x: centerX, y: centerY }, rotation: 0 }
      );
      break;
  }

  return furniture;
}

// ─── Default Materials ───────────────────────────────────────────────────────

function getDefaultMaterials(roomType: string): MaterialSpec {
  const defaults: Record<string, MaterialSpec> = {
    living: { floor: 'oak-hardwood', wall: 'warm-white' },
    bedroom: { floor: 'carpet-beige', wall: 'cool-white' },
    kitchen: { floor: 'ceramic-tile', wall: 'warm-white' },
    bathroom: { floor: 'ceramic-tile', wall: 'cool-white' },
    dining: { floor: 'oak-hardwood', wall: 'warm-white' },
    work: { floor: 'walnut-hardwood', wall: 'warm-white' },
    study: { floor: 'walnut-hardwood', wall: 'warm-white' },
    entry: { floor: 'marble-tile', wall: 'warm-white' },
    hallway: { floor: 'oak-hardwood', wall: 'warm-white' },
    circulation: { floor: 'oak-hardwood', wall: 'warm-white' },
  };
  return defaults[roomType] || { floor: 'oak-hardwood', wall: 'warm-white' };
}

// ─── Wall Generation ─────────────────────────────────────────────────────────

export function generateWalls(rooms: Room[]): Wall[] {
  const walls: Wall[] = [];
  const wallSet = new Set<string>();

  rooms.forEach(room => {
    const points = room.points;
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];

      const wallKey = `${Math.min(p1.x, p2.x)},${Math.min(p1.y, p2.y)}-${Math.max(p1.x, p2.x)},${Math.max(p1.y, p2.y)}`;

      if (!wallSet.has(wallKey)) {
        wallSet.add(wallKey);
        walls.push({
          id: `wall-${walls.length + 1}`,
          start: { x: p1.x, y: p1.y },
          end: { x: p2.x, y: p2.y },
          thickness: 6,
        });
      }
    }
  });

  return walls;
}

// ─── Door Generation ─────────────────────────────────────────────────────────

function wallsOverlap(
  w1s: Point, w1e: Point, w2s: Point, w2e: Point, tolerance = 6
): { x: number; y: number; rotation: number; length: number } | null {
  const isH1 = Math.abs(w1s.y - w1e.y) < tolerance;
  const isH2 = Math.abs(w2s.y - w2e.y) < tolerance;
  const isV1 = Math.abs(w1s.x - w1e.x) < tolerance;
  const isV2 = Math.abs(w2s.x - w2e.x) < tolerance;

  if (isH1 && isH2) {
    if (Math.abs(w1s.y - w2s.y) > tolerance) return null;
    const overlapStart = Math.max(Math.min(w1s.x, w1e.x), Math.min(w2s.x, w2e.x));
    const overlapEnd = Math.min(Math.max(w1s.x, w1e.x), Math.max(w2s.x, w2e.x));
    if (overlapEnd - overlapStart > 36) {
      return { x: (overlapStart + overlapEnd) / 2, y: w1s.y, rotation: 0, length: overlapEnd - overlapStart };
    }
  } else if (isV1 && isV2) {
    if (Math.abs(w1s.x - w2s.x) > tolerance) return null;
    const overlapStart = Math.max(Math.min(w1s.y, w1e.y), Math.min(w2s.y, w2e.y));
    const overlapEnd = Math.min(Math.max(w1s.y, w1e.y), Math.max(w2s.y, w2e.y));
    if (overlapEnd - overlapStart > 36) {
      return { x: w1s.x, y: (overlapStart + overlapEnd) / 2, rotation: 90, length: overlapEnd - overlapStart };
    }
  }
  return null;
}

export function generateDoors(rooms: Room[]): Door[] {
  const doors: Door[] = [];
  const addedDoors = new Set<string>();

  for (let i = 0; i < rooms.length; i++) {
    const room1 = rooms[i];
    if (!room1.points || room1.points.length < 3) continue;

    for (let j = i + 1; j < rooms.length; j++) {
      const room2 = rooms[j];
      if (!room2.points || room2.points.length < 3) continue;

      for (let w1 = 0; w1 < room1.points.length; w1++) {
        const wall1Start = room1.points[w1];
        const wall1End = room1.points[(w1 + 1) % room1.points.length];

        for (let w2 = 0; w2 < room2.points.length; w2++) {
          const wall2Start = room2.points[w2];
          const wall2End = room2.points[(w2 + 1) % room2.points.length];

          const overlap = wallsOverlap(wall1Start, wall1End, wall2Start, wall2End);
          if (overlap) {
            const doorKey = `${Math.round(overlap.x)}-${Math.round(overlap.y)}`;
            if (addedDoors.has(doorKey)) continue;

            const isMainEntrance = room1.type === 'entry' || room2.type === 'entry';
            const isBathroom = room1.type === 'bathroom' || room2.type === 'bathroom';
            const doorWidth = isMainEntrance ? 42 : isBathroom ? 28 : 32;

            doors.push({
              id: `door-${room1.id}-${room2.id}`,
              position: { x: overlap.x, y: overlap.y },
              width: doorWidth,
              rotation: overlap.rotation,
              type: isMainEntrance ? 'double' : 'single',
              connects: [room1.id, room2.id],
            });
            addedDoors.add(doorKey);
          }
        }
      }
    }
  }

  // Fallback: if no doors found between rooms, add on first wall of each
  if (doors.length === 0) {
    rooms.forEach(room => {
      if (room.type === 'circulation' || !room.points || room.points.length < 2) return;
      const p1 = room.points[0];
      const p2 = room.points[1];
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const rotation = Math.atan2(dy, dx) * (180 / Math.PI);

      doors.push({
        id: `door-${room.id}`,
        position: { x: midX, y: midY },
        width: room.type === 'entry' ? 42 : room.type === 'bathroom' ? 28 : 32,
        rotation,
        type: room.type === 'entry' ? 'double' : 'single',
      });
    });
  }

  return doors;
}

// ─── Window Generation ───────────────────────────────────────────────────────

function isExteriorWall(wallStart: Point, wallEnd: Point, allRooms: Room[], tolerance = 12): boolean {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  allRooms.forEach(room => {
    room.points.forEach(p => {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    });
  });

  const isHorizontal = Math.abs(wallStart.y - wallEnd.y) < tolerance;
  const isVertical = Math.abs(wallStart.x - wallEnd.x) < tolerance;

  if (isHorizontal) {
    return Math.abs(wallStart.y - minY) < tolerance || Math.abs(wallStart.y - maxY) < tolerance;
  } else if (isVertical) {
    return Math.abs(wallStart.x - minX) < tolerance || Math.abs(wallStart.x - maxX) < tolerance;
  }
  return false;
}

export function generateWindows(rooms: Room[]): Window[] {
  const windows: Window[] = [];
  const addedWindows = new Set<string>();

  const windowPrefs: Record<string, { count: number; width: number }> = {
    living: { count: 2, width: 72 },
    bedroom: { count: 2, width: 48 },
    dining: { count: 1, width: 60 },
    kitchen: { count: 1, width: 48 },
    study: { count: 1, width: 48 },
    work: { count: 1, width: 48 },
    bathroom: { count: 1, width: 24 },
  };

  rooms.forEach(room => {
    if (['circulation', 'hallway', 'entry'].includes(room.type)) return;
    if (!room.points || room.points.length < 3) return;

    const prefs = windowPrefs[room.type] || { count: 1, width: 36 };
    let windowsAdded = 0;

    for (let w = 0; w < room.points.length && windowsAdded < prefs.count; w++) {
      const wallStart = room.points[w];
      const wallEnd = room.points[(w + 1) % room.points.length];

      if (isExteriorWall(wallStart, wallEnd, rooms)) {
        const midX = (wallStart.x + wallEnd.x) / 2;
        const midY = (wallStart.y + wallEnd.y) / 2;
        const windowKey = `${Math.round(midX / 24)}-${Math.round(midY / 24)}`;

        if (addedWindows.has(windowKey)) continue;

        const dx = wallEnd.x - wallStart.x;
        const dy = wallEnd.y - wallStart.y;
        const wallLength = Math.sqrt(dx * dx + dy * dy);

        if (wallLength >= prefs.width + 24) {
          const rotation = Math.atan2(dy, dx) * (180 / Math.PI);
          windows.push({
            id: `window-${room.id}-${w}`,
            position: { x: midX, y: midY },
            width: prefs.width,
            rotation,
            type: prefs.width >= 60 ? 'double' : 'single',
            roomId: room.id,
          });
          addedWindows.add(windowKey);
          windowsAdded++;
        }
      }
    }

    // If no exterior walls found, add window on longest wall
    if (windowsAdded === 0 && room.type !== 'bathroom') {
      let longestWall = { length: 0, index: 0 };
      for (let w = 0; w < room.points.length; w++) {
        const ws = room.points[w];
        const we = room.points[(w + 1) % room.points.length];
        const dx = we.x - ws.x;
        const dy = we.y - ws.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length > longestWall.length) {
          longestWall = { length, index: w };
        }
      }

      if (longestWall.length >= prefs.width + 24) {
        const ws = room.points[longestWall.index];
        const we = room.points[(longestWall.index + 1) % room.points.length];
        const midX = (ws.x + we.x) / 2;
        const midY = (ws.y + we.y) / 2;
        const dx = we.x - ws.x;
        const dy = we.y - ws.y;
        const rotation = Math.atan2(dy, dx) * (180 / Math.PI);

        windows.push({
          id: `window-${room.id}-longest`,
          position: { x: midX, y: midY },
          width: prefs.width,
          rotation,
          type: prefs.width >= 60 ? 'double' : 'single',
          roomId: room.id,
        });
      }
    }
  });

  return windows;
}

// ─── Gemini Prompt (VitruviAI style) ─────────────────────────────────────────

function buildFloorPlanPrompt(description: string): string {
  return `You are a professional architect and interior designer. Design a modern, efficient floor plan with furniture based on this request.

User Request: "${description}"

CRITICAL RULES (Scale: 12px = 1 foot):
1. NO OVERLAPS: Rooms must not overlap. This is critical.
2. ALIGNMENT: Walls must align perfectly. Snap coordinates to 6px grid.
3. ROOM SIZES:
   - Living: Large (18-22' x 14-18') = 216-264 x 168-216 pixels
   - Master Bedroom: (12-14' x 12-14') = 144-168 x 144-168 pixels
   - Kitchen: (10-12' x 10-12') = 120-144 x 120-144 pixels
   - Bathroom: (6-8' x 6-8') = 72-96 x 72-96 pixels
   - Dining: (12-14' x 10-12') = 144-168 x 120-144 pixels
   - Balcony: (12-15' x 5-6') = 144-180 x 60-72 pixels
   - Entry/Hallway: (8-10' x 6-8') = 96-120 x 72-96 pixels
4. LAYOUT LOGIC:
   - Entry -> Living -> Dining/Kitchen
   - Hallway separates public and private areas
   - Bedrooms tucked away for privacy
   - Bathrooms adjacent to bedrooms
5. START COORDINATES at approximately x:150, y:150 to leave margin

FURNITURE PLACEMENT RULES:
- Position furniture INSIDE the room boundaries (within the polygon points)
- Use absolute pixel coordinates for furniture positions
- Rotation is in degrees (0, 90, 180, 270)

FURNITURE TYPES BY ROOM:
- living: sofa, coffee-table, tv-stand, armchair, floor-lamp, plant
- bedroom: bed, nightstand, dresser, wardrobe, floor-lamp
- kitchen: counter, stove, refrigerator, island
- bathroom: toilet, sink, bathtub
- dining: dining-table, chairs
- work/study: desk, office-chair, bookshelf
- entry: console-table, coat-rack

MATERIAL OPTIONS:
- floor: oak-hardwood, walnut-hardwood, marble-tile, ceramic-tile, carpet-beige
- wall: warm-white, cool-white, exposed-brick

OUTPUT EACH ROOM AS A SEPARATE JSON OBJECT, ONE PER LINE:
{"id": "living-1", "type": "living", "name": "Living Room", "points": [{"x": 150, "y": 150}, {"x": 390, "y": 150}, {"x": 390, "y": 366}, {"x": 150, "y": 366}], "furniture": [{"type": "sofa", "position": {"x": 270, "y": 320}, "rotation": 180}, {"type": "coffee-table", "position": {"x": 270, "y": 260}, "rotation": 0}, {"type": "tv-stand", "position": {"x": 270, "y": 170}, "rotation": 0}], "materials": {"floor": "oak-hardwood", "wall": "warm-white"}}
{"id": "bedroom-1", "type": "bedroom", "name": "Master Bedroom", "points": [{"x": 390, "y": 150}, {"x": 534, "y": 150}, {"x": 534, "y": 294}, {"x": 390, "y": 294}], "furniture": [{"type": "bed", "position": {"x": 462, "y": 200}, "rotation": 0}, {"type": "nightstand", "position": {"x": 410, "y": 200}, "rotation": 0}], "materials": {"floor": "carpet-beige", "wall": "cool-white"}}

Generate rooms one by one. Each room should be a complete, valid JSON object on its own line.
Include furniture array and materials object for EVERY room.
Start with the main living areas, then bedrooms, then bathrooms.
Return ONLY the JSON lines, no explanatory text.`;
}

// ─── Extract rooms from Gemini response ──────────────────────────────────────

function extractRoomsFromResponse(text: string): Room[] {
  const rooms: Room[] = [];
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{')) continue;

    // Find matching closing brace
    let braceCount = 0;
    let endIdx = -1;
    for (let i = 0; i < trimmed.length; i++) {
      if (trimmed[i] === '{') braceCount++;
      if (trimmed[i] === '}') braceCount--;
      if (braceCount === 0) { endIdx = i; break; }
    }
    if (endIdx === -1) continue;

    const jsonStr = trimmed.substring(0, endIdx + 1);

    try {
      const room = JSON.parse(jsonStr);
      if (room.id && room.type && Array.isArray(room.points) && room.points.length >= 3) {
        // Snap to 6px grid
        room.points = room.points.map((p: Point) => ({
          x: Math.round(p.x / 6) * 6,
          y: Math.round(p.y / 6) * 6,
        }));
        room.area = calculatePolygonArea(room.points);

        // Validate/generate furniture
        if (room.furniture && Array.isArray(room.furniture) && room.furniture.length > 0) {
          room.furniture = room.furniture
            .filter((f: FurniturePlacement) => f.type && f.position && typeof f.position.x === 'number' && typeof f.position.y === 'number')
            .map((f: FurniturePlacement) => ({
              type: f.type,
              position: {
                x: Math.round(f.position.x / 6) * 6,
                y: Math.round(f.position.y / 6) * 6,
              },
              rotation: f.rotation || 0,
              variant: f.variant,
            }));
        }
        if (!room.furniture || room.furniture.length === 0) {
          room.furniture = generateDefaultFurniture(room);
        }

        // Materials
        if (!room.materials || typeof room.materials !== 'object') {
          room.materials = getDefaultMaterials(room.type);
        }

        rooms.push(room as Room);
      }
    } catch {
      // Skip invalid JSON
    }
  }

  return rooms;
}

// ─── Main Generator ──────────────────────────────────────────────────────────

// ─── AI Image Generation for Floor Plan ──────────────────────────────────────

async function generateFloorPlanImage(description: string, rooms: Room[]): Promise<string | undefined> {
  try {
    const roomDescriptions = rooms.map(r => {
      const xs = r.points.map(p => p.x);
      const ys = r.points.map(p => p.y);
      const w = Math.round((Math.max(...xs) - Math.min(...xs)) / 12);
      const h = Math.round((Math.max(...ys) - Math.min(...ys)) / 12);
      return `${r.name}: ${w}ft x ${h}ft (${r.area} sq ft)`;
    }).join(', ');

    const imagePrompt = `Generate a professional 2D architectural floor plan image for: "${description}"

The floor plan should include these rooms: ${roomDescriptions}

Requirements:
- Professional architectural drawing style with clean lines
- Top-down 2D view, like a real blueprint
- Each room clearly labeled with name and dimensions
- Thick black walls between rooms
- Door openings shown with arc symbols
- Windows shown as parallel lines on exterior walls
- Different pastel colors for different room types (green for living, purple for bedrooms, blue for bathrooms, orange for kitchen, yellow for dining)
- Include furniture symbols inside rooms (beds, sofa, dining table, kitchen counter, toilet, sink)
- Clean white background
- Include a north arrow and scale bar
- Professional architectural quality, no 3D elements
- Rooms should be properly adjacent with shared walls, no gaps between rooms`;

    const { imageBase64, mimeType } = await generateImage(imagePrompt);
    return `data:${mimeType};base64,${imageBase64}`;
  } catch (err) {
    console.warn('Floor plan image generation failed:', err instanceof Error ? err.message : err);
    return undefined;
  }
}

export async function generateFloorPlan(description: string): Promise<FloorPlan> {
  const prompt = buildFloorPlanPrompt(description);
  const text = await generateText(prompt, SYSTEM_INSTRUCTION);

  const rooms = extractRoomsFromResponse(text);

  if (rooms.length === 0) {
    throw new Error('No valid rooms generated. Please try a different description.');
  }

  // Generate walls, doors, windows algorithmically (VitruviAI approach)
  const walls = generateWalls(rooms);
  const doors = generateDoors(rooms);
  const windows = generateWindows(rooms);

  // Calculate total area
  const totalArea = rooms.reduce((sum, r) => sum + r.area, 0);

  // Generate AI image of the floor plan
  const floorPlanImage = await generateFloorPlanImage(description, rooms);

  return {
    title: `Floor Plan: ${description.slice(0, 50)}`,
    totalArea: `${totalArea} sq ft`,
    rooms,
    walls,
    doors,
    windows,
    summary: `Generated ${rooms.length} rooms with ${doors.length} doors and ${windows.length} windows.`,
    materials: [...new Set(rooms.map(r => `${r.name}: ${r.materials.floor} floor, ${r.materials.wall} walls`))],
    estimatedCost: `Estimated based on ${totalArea} sq ft`,
    floorPlanImage,
  };
}

// ─── Sketch Analysis ─────────────────────────────────────────────────────────

export async function analyzeSketch(imageBase64: string, mimeType: string): Promise<FloorPlan> {
  const prompt = `Analyze this hand-drawn floor plan sketch. For each room, output a JSON object on its own line with: id, type, name, points (polygon pixel coordinates, 12px=1ft, snapped to 6px grid), furniture, materials. Start coordinates at x:150, y:150. Return ONLY JSON lines.`;

  const { generateVisionContent } = await import('../gemini');
  const text = await generateVisionContent(prompt, imageBase64, mimeType, SYSTEM_INSTRUCTION);
  const rooms = extractRoomsFromResponse(text);

  if (rooms.length === 0) {
    throw new Error('Could not extract rooms from sketch');
  }

  const walls = generateWalls(rooms);
  const doors = generateDoors(rooms);
  const windows = generateWindows(rooms);
  const totalArea = rooms.reduce((sum, r) => sum + r.area, 0);

  return {
    title: 'Digitized Floor Plan',
    totalArea: `${totalArea} sq ft`,
    rooms,
    walls,
    doors,
    windows,
    summary: `Digitized ${rooms.length} rooms from sketch.`,
    materials: [],
    estimatedCost: 'N/A',
  };
}

// ─── Chat Formatting ─────────────────────────────────────────────────────────

export function formatFloorPlanForChat(plan: FloorPlan): string {
  const roomList = plan.rooms
    .map((r) => {
      const xs = r.points.map(p => p.x);
      const ys = r.points.map(p => p.y);
      const w = Math.round((Math.max(...xs) - Math.min(...xs)) / 12);
      const h = Math.round((Math.max(...ys) - Math.min(...ys)) / 12);
      return `- ${r.name} -- ${w}' x ${h}' -- ${r.area} sq ft`;
    })
    .join('\n');

  return `## ${plan.title}

**Total Area:** ${plan.totalArea}

### Room Schedule

${roomList}

### Layout

- ${plan.doors.length} doors placed at shared walls
- ${plan.windows.length} windows on exterior walls

### Materials

${plan.materials.map((m) => `- ${m}`).join('\n')}`;
}

export { generateInsights } from './floorplan-insights';
