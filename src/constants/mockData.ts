// =============================================
// NOBET - MOCK DATA & CONSTANTS
// =============================================

export const MAX_CLICKS = 10;

export interface Staff {
  id: number;
  name: string;
  role: string;
  avatar: string;
}

export interface ShiftOvertime {
  pzt: number;
  sal: number;
  car: number;
  per: number;
  cum: number;
  cmt: number;
  paz: number;
}

export interface ShiftDefinition {
  id: number;
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  duration: string;
  breakTime: string;
  description: string;
  overtime: ShiftOvertime;
}

export const STAFF_LIST: Staff[] = [
  { id: 1, name: 'Ahmet Yılmaz', role: 'Developer', avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Ahmet' },
  { id: 2, name: 'Ayşe Demir', role: 'Designer', avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Ayse' },
  { id: 3, name: 'Mehmet Kaya', role: 'DevOps', avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Mehmet' },
  { id: 4, name: 'Selin Vural', role: 'Manager', avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Selin' },
  { id: 5, name: 'Caner Erkin', role: 'Sales', avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Caner' },
];

export const INITIAL_SHIFT_DEFINITIONS: ShiftDefinition[] = [
  {
    id: 1,
    code: 'GND',
    name: 'Gündüz',
    startTime: '08:00',
    endTime: '16:00',
    duration: '8 Saat',
    breakTime: '1 Saat',
    description: 'Standart gündüz mesaisi.',
    overtime: { pzt: 0, sal: 0, car: 0, per: 0, cum: 0, cmt: 2, paz: 2 }
  },
  {
    id: 2,
    code: 'AKS',
    name: 'Akşam',
    startTime: '16:00',
    endTime: '24:00',
    duration: '8 Saat',
    breakTime: '45 Dk',
    description: 'Öğleden sonra vardiyası.',
    overtime: { pzt: 1, sal: 1, car: 1, per: 1, cum: 1, cmt: 3, paz: 3 }
  },
  {
    id: 3,
    code: 'GCE',
    name: 'Gece',
    startTime: '00:00',
    endTime: '08:00',
    duration: '8 Saat',
    breakTime: '45 Dk',
    description: 'Gece vardiyası.',
    overtime: { pzt: 2, sal: 2, car: 2, per: 2, cum: 2, cmt: 4, paz: 4 }
  },
  {
    id: 4,
    code: 'HFT',
    name: 'Hafta Sonu',
    startTime: '09:00',
    endTime: '18:00',
    duration: '9 Saat',
    breakTime: '1 Saat',
    description: 'Hafta sonu nöbeti.',
    overtime: { pzt: 0, sal: 0, car: 0, per: 0, cum: 0, cmt: 0, paz: 0 }
  },
];

// Dashboard mock data
export const DASHBOARD_ACTIVITIES = [
  { name: 'Ayşe Yılmaz', role: 'Designer', dept: 'Tasarım', status: 'Aktif', date: '09:41' },
  { name: 'Mehmet Demir', role: 'Dev', dept: 'Yazılım', status: 'İzinde', date: 'Dün' }
];

// Shader code for PixelBlast effect
export const VERTEX_SRC = `
void main() {
  gl_Position = vec4(position, 1.0);
}
`;

export const FRAGMENT_SRC = `
precision highp float;

uniform vec3  uColor;
uniform vec2  uResolution;
uniform float uTime;
uniform float uPixelSize;
uniform float uScale;
uniform float uDensity;
uniform float uPixelJitter;
uniform int   uEnableRipples;
uniform float uRippleSpeed;
uniform float uRippleThickness;
uniform float uRippleIntensity;
uniform float uEdgeFade;

const int MAX_CLICKS_SHADER = 10;
uniform vec2  uClickPos[MAX_CLICKS_SHADER];
uniform float uClickTimes[MAX_CLICKS_SHADER];

float Bayer2(vec2 a) {
  a = floor(a);
  return fract(a.x / 2. + a.y * a.y * .75);
}
#define Bayer4(a) (Bayer2(.5*(a))*0.25 + Bayer2(a))
#define Bayer8(a) (Bayer4(.5*(a))*0.25 + Bayer2(a))

#define FBM_OCTAVES     5
#define FBM_LACUNARITY  1.25
#define FBM_GAIN        1.0

float hash11(float n){ return fract(sin(n)*43758.5453); }

float vnoise(vec3 p){
  vec3 ip = floor(p);
  vec3 fp = fract(p);
  float n000 = hash11(dot(ip + vec3(0.0,0.0,0.0), vec3(1.0,57.0,113.0)));
  float n100 = hash11(dot(ip + vec3(1.0,0.0,0.0), vec3(1.0,57.0,113.0)));
  float n010 = hash11(dot(ip + vec3(0.0,1.0,0.0), vec3(1.0,57.0,113.0)));
  float n110 = hash11(dot(ip + vec3(1.0,1.0,0.0), vec3(1.0,57.0,113.0)));
  float n001 = hash11(dot(ip + vec3(0.0,0.0,1.0), vec3(1.0,57.0,113.0)));
  float n101 = hash11(dot(ip + vec3(1.0,0.0,1.0), vec3(1.0,57.0,113.0)));
  float n011 = hash11(dot(ip + vec3(0.0,1.0,1.0), vec3(1.0,57.0,113.0)));
  float n111 = hash11(dot(ip + vec3(1.0,1.0,1.0), vec3(1.0,57.0,113.0)));
  vec3 w = fp*fp*fp*(fp*(fp*6.0-15.0)+10.0);
  float x00 = mix(n000, n100, w.x);
  float x10 = mix(n010, n110, w.x);
  float x01 = mix(n001, n101, w.x);
  float x11 = mix(n011, n111, w.x);
  float y0  = mix(x00, x10, w.y);
  float y1  = mix(x01, x11, w.y);
  return mix(y0, y1, w.z) * 2.0 - 1.0;
}

float fbm2(vec2 uv, float t){
  vec3 p = vec3(uv * uScale, t);
  float amp = 1.0;
  float freq = 1.0;
  float sum = 1.0;
  for (int i = 0; i < FBM_OCTAVES; ++i){
    sum  += amp * vnoise(p * freq);
    freq *= FBM_LACUNARITY;
    amp  *= FBM_GAIN;
  }
  return sum * 0.5 + 0.5;
}

void main(){
  vec2 fragCoord = gl_FragCoord.xy - uResolution * .5;
  float aspectRatio = uResolution.x / uResolution.y;
  vec2 uv = gl_FragCoord.xy / uResolution * vec2(aspectRatio, 1.0);

  float base = fbm2(uv, uTime * 0.05);
  base = base * 0.4 + 0.1;

  float feed = base + (uDensity - 0.5) * 0.3;

  if (uEnableRipples == 1) {
    for (int i = 0; i < MAX_CLICKS_SHADER; ++i){
      vec2 pos = uClickPos[i];
      if (pos.x < 0.0) continue;
      vec2 cuv = (((pos - uResolution * .5) / (uResolution))) * vec2(aspectRatio, 1.0);
      vec2 myUv = (gl_FragCoord.xy - uResolution * .5) / uResolution * vec2(aspectRatio, 1.0);
      float t = max(uTime - uClickTimes[i], 0.0);
      float r = distance(myUv, cuv);
      float waveR = uRippleSpeed * t;
      float ring  = exp(-pow((r - waveR) / uRippleThickness, 2.0));
      float atten = exp(-1.0 * t) * exp(-10.0 * r);
      feed = max(feed, ring * atten * uRippleIntensity);
    }
  }

  float bayer = Bayer8(gl_FragCoord.xy / uPixelSize) - 0.5;
  float bw = step(0.5, feed + bayer);
  float coverage = bw;
  
  if (uEdgeFade > 0.0) {
    vec2 norm = gl_FragCoord.xy / uResolution;
    float edge = min(min(norm.x, norm.y), min(1.0 - norm.x, 1.0 - norm.y));
    float fade = smoothstep(0.0, uEdgeFade, edge);
    coverage *= fade;
  }

  // Blend between background color and pixel color based on coverage
  // This ensures full screen coverage - no transparent areas
  vec3 bgColor = vec3(0.04, 0.04, 0.06); // Dark background matching theme
  vec3 pixelColor = uColor;
  vec3 finalColor = mix(bgColor, pixelColor, coverage);
  
  gl_FragColor = vec4(finalColor, 1.0); // Always fully opaque
}
`;
