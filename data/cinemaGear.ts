
export interface CameraModel {
    brand: 'ARRI' | 'RED';
    model: string;
    sensor: string;
    resolution: string;
    dynamicRange: string;
    baseISO: string;
    nativeColorScience: string;
}

export interface LensKit {
    brand: 'ARRI' | 'ZEISS' | 'Cooke' | 'Canon';
    series: string;
    mount: string;
    character: string;
    focalLengths: string[];
    apertures: string[]; // e.g. T1.8
}

export interface CinemaPreset {
    id: string;
    name: string;
    description: string;
    settings: {
        cameraModel: string;
        lensSeries: string;
        focalLength: string;
        aperture: string;
        iso: string;
        shutter: string;
        fps: string;
        colorScience: string;
        sensorMode?: string;
        recordingFormat?: string;
    };
}

export const CINEMA_CAMERAS: CameraModel[] = [
    // ARRI
    { brand: 'ARRI', model: 'ALEXA 35', sensor: 'Super 35 (4.6K)', resolution: '4.6K', dynamicRange: '17+ stops', baseISO: '800', nativeColorScience: 'REVEAL Color Science' },
    { brand: 'ARRI', model: 'ALEXA Mini LF', sensor: 'Large Format', resolution: '4.5K', dynamicRange: '14+ stops', baseISO: '800', nativeColorScience: 'Log C3' },
    { brand: 'ARRI', model: 'ALEXA LF', sensor: 'Large Format', resolution: '4.5K', dynamicRange: '14+ stops', baseISO: '800', nativeColorScience: 'Log C3' },
    { brand: 'ARRI', model: 'ALEXA Mini', sensor: 'Super 35 (3.4K)', resolution: '3.4K', dynamicRange: '14+ stops', baseISO: '800', nativeColorScience: 'Log C3' },

    // RED
    { brand: 'RED', model: 'V-RAPTOR [X] 8K VV', sensor: 'Vista Vision (8K)', resolution: '8K', dynamicRange: '17+ stops', baseISO: '800', nativeColorScience: 'IPP2' },
    { brand: 'RED', model: 'V-RAPTOR 8K VV', sensor: 'Vista Vision (8K)', resolution: '8K', dynamicRange: '17+ stops', baseISO: '800', nativeColorScience: 'IPP2' },
    { brand: 'RED', model: 'V-RAPTOR 8K S35', sensor: 'Super 35 (8K)', resolution: '8K', dynamicRange: '17+ stops', baseISO: '800', nativeColorScience: 'IPP2' },
    { brand: 'RED', model: 'KOMODO-X', sensor: 'Super 35 (6K)', resolution: '6K', dynamicRange: '16+ stops', baseISO: '800', nativeColorScience: 'IPP2' },
    { brand: 'RED', model: 'KOMODO 6K', sensor: 'Super 35 (6K)', resolution: '6K', dynamicRange: '16+ stops', baseISO: '800', nativeColorScience: 'IPP2' },
];

export const CINEMA_LENSES: LensKit[] = [
    {
        brand: 'ARRI',
        series: 'Signature Prime',
        mount: 'LPL',
        character: 'Clean, warm skin tones, soft bokeh',
        focalLengths: ['12mm', '15mm', '18mm', '21mm', '25mm', '29mm', '35mm', '40mm', '47mm', '58mm', '75mm', '95mm', '125mm', '150mm', '200mm', '280mm'],
        apertures: ['T1.8']
    },
    {
        brand: 'ZEISS',
        series: 'Supreme Prime',
        mount: 'PL',
        character: 'Sharp but organic, gentle roll-off',
        focalLengths: ['15mm', '18mm', '21mm', '25mm', '29mm', '35mm', '40mm', '50mm', '65mm', '85mm', '100mm', '135mm', '200mm'],
        apertures: ['T1.5', 'T2.2']
    },
    {
        brand: 'Cooke',
        series: 'S7/i Full Frame',
        mount: 'PL/LPL',
        character: 'The "Cooke Look", warm, cinematic',
        focalLengths: ['16mm', '18mm', '21mm', '25mm', '27mm', '32mm', '40mm', '50mm', '65mm', '75mm', '100mm', '135mm', '180mm', '300mm'],
        apertures: ['T2.0']
    },
    {
        brand: 'Canon',
        series: 'RF L-Series (Photo/Hybrid)',
        mount: 'RF',
        character: 'Sharp, modern, versatile',
        focalLengths: ['24-70mm', '50mm', '85mm'], // Simplified for "Run-and-Gun" preset
        apertures: ['f/2.8', 'f/1.2']
    },
];

export const CINEMA_PRESETS: CinemaPreset[] = [
    {
        id: 'cinematic-drama',
        name: 'Cinematic Drama',
        description: 'Classic high-end cinema look. Ideal for narrative storytelling.',
        settings: {
            cameraModel: 'ALEXA Mini LF',
            lensSeries: 'ARRI Signature Prime',
            focalLength: '35mm',
            aperture: 'Open (T1.8)',
            iso: '800',
            shutter: '180°',
            fps: '24',
            colorScience: 'Log C, ARRI Wide Gamut',
            sensorMode: 'LF Open Gate (4448 x 3096)',
            recordingFormat: 'ARRIRAW'
        }
    },
    {
        id: 'high-end-commercial',
        name: 'High-End Commercial',
        description: 'Ultra-crisp, clean, high resolution. Perfect for product shots.',
        settings: {
            cameraModel: 'V-RAPTOR 8K VV',
            lensSeries: 'ZEISS Supreme Prime',
            focalLength: '50mm',
            aperture: 'T1.5',
            iso: '800',
            shutter: '180°',
            fps: '24',
            colorScience: 'IPP2 (REDWideGamutRGB, Log3G10)',
            recordingFormat: 'REDCODE RAW HQ'
        }
    },
    {
        id: 'run-and-gun-doc',
        name: 'Run-and-Gun Doc',
        description: 'Gritty, real, slightly digital edge. Good for action/reportage.',
        settings: {
            cameraModel: 'KOMODO 6K',
            lensSeries: 'Canon RF L-Series (Photo/Hybrid)',
            focalLength: '24-70mm',
            aperture: 'f/2.8',
            iso: '800',
            shutter: '1/50 (180° equivalent)',
            fps: '25',
            colorScience: 'IPP2',
            recordingFormat: 'REDCODE RAW MQ'
        }
    },
    {
        id: 'slow-motion-action',
        name: 'Slow Motion Action',
        description: 'Smooth motion, high frame rate capture.',
        settings: {
            cameraModel: 'ALEXA 35',
            lensSeries: 'ARRI Signature Prime',
            focalLength: '75mm',
            aperture: 'T1.8',
            iso: '1600',
            shutter: '180°',
            fps: '120',
            colorScience: 'REVEAL',
            sensorMode: '4.6K 16:9'
        }
    },
    {
        id: 'low-light-night',
        name: 'Low Light / Night',
        description: 'Clean shadows, moody atmosphere.',
        settings: {
            cameraModel: 'ALEXA LF',
            lensSeries: 'ARRI Signature Prime',
            focalLength: '25mm',
            aperture: 'Wide Open (T1.8)',
            iso: '3200',
            shutter: '180°',
            fps: '24',
            colorScience: 'Log C3',
            sensorMode: 'LF Open Gate',
            recordingFormat: 'ProRes 4444 XQ'
        }
    },
    {
        id: 'interview-talking-head',
        name: 'Interview / Portrait',
        description: 'Shallow depth of field, flattering skin tones.',
        settings: {
            cameraModel: 'V-RAPTOR 8K S35',
            lensSeries: 'Cooke S7/i Full Frame',
            focalLength: '85mm',
            aperture: 'T2.0',
            iso: '400',
            shutter: '180°',
            fps: '24',
            colorScience: 'IPP2',
            recordingFormat: 'REDCODE RAW HQ'
        }
    }
];
