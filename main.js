import { sceneState, addAssetToScene, markAsDirty, isStateDirty } from './state.js';
import { initializeCanvas, redrawCanvas, clearAssetImages, setTool } from './editor.js';
import { generateImage } from './api.js';
import { 
    showLoader, hideLoader, selectLibraryAsset, updatePropertiesPanel, 
    setupPanelToggles, addAssetToLibrary, 
    updateSaveButtonState, updateLastGeneratedAsset 
} from './ui.js';
import { handleImportJson, handleExportJson } from './fileHandlers.js';
import { saveStateToLocalStorage, loadStateFromLocalStorage } from './stateManager.js';
import { initializeDragDrop } from './dragDrop.js';

// DOM Elements
const generateSceneBtn = document.getElementById('generate-scene-btn');
const generateAssetBtn = document.getElementById('generate-asset-btn');
const importJsonBtn = document.getElementById('import-json-btn');
const exportJsonBtn = document.getElementById('export-json-btn');
const saveBtn = document.getElementById('save-btn');
const assetLibrary = document.getElementById('asset-library');
const scenePrompt = document.getElementById('scene-prompt');

async function handleGenerateScene() {
    showLoader();
    const prompt = scenePrompt.value || scenePrompt.placeholder;
    try {
        const result = await generateImage(prompt, false, "16:9");
        sceneState.background = result.url;
        markAsDirty();
        redrawCanvas();
    } catch (error) {
        console.error('Failed to generate scene:', error);
        alert('Could not generate scene background.');
    } finally {
        hideLoader();
    }
}

async function handleGenerateAsset() {
    showLoader();
    const prompt = document.getElementById('asset-prompt').value;
    if (!prompt) {
        alert('Please enter a prompt for the asset.');
        hideLoader();
        return;
    }
    try {
        const toggleBtn = document.getElementById('asset-transparent-toggle');
        const isTransparent = toggleBtn.classList.contains('toggled-on');
        const result = await generateImage(prompt, isTransparent, "1:1");
        const assetType = document.getElementById('asset-type').value;
        
        const assetData = {
            id: `asset_${Date.now()}`,
            type: assetType,
            prompt: prompt,
            url: result.url,
            name: `${assetType} - ${prompt.substring(0, 15)}...`
        };
        
        updateLastGeneratedAsset(assetData);
        
        const libraryImg = addAssetToLibrary(assetData);
        selectLibraryAsset(libraryImg);

        markAsDirty();
    } catch (error) {
        console.error('Failed to generate asset:', error);
        alert('Could not generate asset.');
    } finally {
        hideLoader();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. Load initial state
    const loadedLibraryAssets = loadStateFromLocalStorage();
    loadedLibraryAssets.forEach(assetData => addAssetToLibrary(assetData));

    // 2. Initialize modules
    initializeCanvas(document.getElementById('editor-canvas'));
    initializeDragDrop();
    setupPanelToggles();

    // 3. Initial draw and UI setup
    redrawCanvas();
    // animatePlaceholder(); // This is now handled inside setupPanelToggles

    // 4. Register event listeners
    generateSceneBtn.addEventListener('click', handleGenerateScene);
    generateAssetBtn.addEventListener('click', handleGenerateAsset);
    importJsonBtn.addEventListener('click', handleImportJson);
    exportJsonBtn.addEventListener('click', handleExportJson);
    saveBtn.addEventListener('click', () => {
        saveStateToLocalStorage();
        updateSaveButtonState(false);
        alert('Scene Saved!');
    });

    assetLibrary.addEventListener('click', (e) => {
        if (e.target.classList.contains('library-asset')) {
            selectLibraryAsset(e.target);
        }
    });

    // 5. Setup periodic tasks
    setInterval(() => {
        if (isStateDirty()) {
            saveStateToLocalStorage();
            updateSaveButtonState(false);
        }
    }, 10000); // Autosave every 10 seconds

    setInterval(() => {
        updateSaveButtonState(isStateDirty());
    }, 1000);

    window.addEventListener('beforeunload', (e) => {
        if (isStateDirty()) {
            e.preventDefault();
            e.returnValue = '';
            return 'You have unsaved changes. Are you sure you want to leave?';
        }
    });
});