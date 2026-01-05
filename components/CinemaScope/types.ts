export interface Shot {
    shotNumber: number;
    shotType: string;
    cameraMovement: string;
    composition: string;
    lighting: string;
    action: string;
    dialogue?: string;
    styleNotes: string;
    framePrompt: string;
}

export interface Scene {
    sceneNumber: number;
    location: string;
    sceneDescription: string;
    shots: Shot[];
}

export interface ParsedScript {
    title: string;
    totalScenes: number;
    scenes: Scene[];
}

export interface GeneratedPage {
    pageNumber: number;
    sceneNumber: number;
    imageUrl: string; // URL from backend/Replicate
    shotsIncluded: number[]; // Shot numbers included on this page
    generationPrompt: string;
}

export interface CroppedFrame {
    frameIndex: number; // 0-5
    pageNumber: number;
    shotNumber: number;
    base64: string; // Data URI
    shotData: Shot;
}

export interface HiFiFrame {
    shotNumber: number;
    imageUrl: string;
    generationPrompt: string;
}

export type CinemaScopeStep = 1 | 2 | 3 | 4 | 5 | 6;
