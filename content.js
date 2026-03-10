// content.js
console.log("DnD Beyond Toggles extension loaded!");

let originalAC = null;
let originalSpeed = null;
let originalTempHP = null;
let isMageArmorActive = false;
let isBladesongActive = false;
let isWildShapeActive = false;

// Helper function to extract any ability modifier from the page
function getAbilityModifier(abilityName) {
    const abilitySummaries = document.querySelectorAll('.ddbc-ability-summary');
    const target = abilityName.toLowerCase();

    for (const summary of abilitySummaries) {
        const label = summary.querySelector('.ddbc-ability-summary__label');
        const heading = summary.querySelector('.ddbc-ability-summary__heading');
        const abbr = summary.querySelector('.ddbc-ability-summary__abbr');

        const textContent = (label?.textContent || heading?.textContent || abbr?.textContent || '').trim().toLowerCase();

        if (textContent === target || textContent === target.substring(0, 3)) {
            const modElement = summary.querySelector('.ddbc-ability-summary__primary');
            if (modElement) {
                const modText = modElement.textContent.trim().replace('+', '');
                const modValue = parseInt(modText, 10);
                if (!isNaN(modValue)) return modValue;
            }
        }
    }
    return 0;
}

function calculateAndSetAC() {
    const acDiv = document.querySelector('[data-testid="armor-class-value"]');
    if (!acDiv) return;

    // Capture original AC if not already stored
    if (originalAC === null) {
        originalAC = parseInt(acDiv.innerText, 10);
        if (isNaN(originalAC)) {
            console.warn("Could not parse original AC, defaulting to 10");
            originalAC = 10;
        }
    }

    let currentAC = originalAC;

    // Mage Armor: Base AC becomes 13 + DEX instead of (Base AC)
    if (isMageArmorActive) {
        const dexMod = getAbilityModifier('dexterity');
        currentAC = 13 + dexMod;
    }

    // Wild Shape (Circle of Moon): AC = 13 + WIS (if higher than beast AC)
    if (isWildShapeActive && !isMageArmorActive) {
        const wisMod = getAbilityModifier('wisdom');
        currentAC = 13 + wisMod;
    }

    // Bladesong: Add INT modifier to whatever the AC currently is
    if (isBladesongActive) {
        const intMod = getAbilityModifier('intelligence');
        currentAC += intMod;
    }

    console.log(`Setting AC: ${currentAC} (Base: ${originalAC}, Mage Armor: ${isMageArmorActive}, Wild Shape: ${isWildShapeActive}, Bladesong: ${isBladesongActive})`);
    acDiv.innerText = currentAC.toString();
}

function calculateAndSetSpeed() {
    const speedBoxes = document.querySelectorAll('.ct-speed-box');
    let walkingBox = null;

    for (const box of speedBoxes) {
        const heading = box.querySelector('.ct-speed-box__heading');
        if (heading && heading.textContent.trim().toLowerCase() === 'walking') {
            walkingBox = box;
            break;
        }
    }

    if (!walkingBox) return;

    const speedValueSpan = walkingBox.querySelector('.ct-speed-box__box-value span span:first-child') ||
        walkingBox.querySelector('.ct-speed-box__box-value span:first-child');

    if (!speedValueSpan) return;

    // Capture original speed if not already stored
    if (originalSpeed === null) {
        originalSpeed = parseInt(speedValueSpan.innerText, 10);
        if (isNaN(originalSpeed)) {
            console.warn("Could not parse original speed, defaulting to 30");
            originalSpeed = 30;
        }
    }

    let currentSpeed = originalSpeed;

    // Bladesong: +10 Walking Speed
    if (isBladesongActive) {
        currentSpeed += 10;
    }

    console.log(`Setting Walking Speed: ${currentSpeed} (Base: ${originalSpeed}, Bladesong: ${isBladesongActive})`);
    speedValueSpan.innerText = currentSpeed.toString();
}

function calculateAndSetTempHP(charData) {
    // Find a temp HP element — DnD Beyond displays it near the HP box
    // Try data-testid first, fall back to class-based selectors
    const tempHPInput = document.querySelector('[data-testid="hp-temporary-input"]') ||
        document.querySelector('.ct-health-summary__hp-item--temp input') ||
        document.querySelector('.ddbc-health-bar__temp-hit-points input');

    if (!tempHPInput) {
        console.warn('Could not find Temp HP element');
        return;
    }

    if (originalTempHP === null) {
        originalTempHP = parseInt(tempHPInput.value, 10) || 0;
    }

    if (isWildShapeActive) {
        // Calculate Temp HP = 3 * Druid level (Circle of Moon feature)
        let druidLevel = 1;
        if (charData) {
            const druidClass = (charData.classes || []).find(c =>
                c.definition?.name?.toLowerCase() === 'druid' ||
                c.baseClassDefinition?.name?.toLowerCase() === 'druid'
            );
            if (druidClass) druidLevel = druidClass.level || 1;
        }
        const tempHP = 3 * druidLevel;
        console.log(`Setting Temp HP: ${tempHP} (Druid level: ${druidLevel})`);
        tempHPInput.value = tempHP;
        // Dispatch change event so D&D Beyond's React app picks it up
        tempHPInput.dispatchEvent(new Event('input', { bubbles: true }));
        tempHPInput.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
        const restore = originalTempHP || 0;
        tempHPInput.value = restore;
        tempHPInput.dispatchEvent(new Event('input', { bubbles: true }));
        tempHPInput.dispatchEvent(new Event('change', { bubbles: true }));
        originalTempHP = null; // Reset tracking
    }
}

function createToggleRow(id, labelText, initialState, onChange) {
    const row = document.createElement('div');
    row.classList.add('dndb-toggle-row');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.justifyContent = 'space-between';
    row.style.gap = '20px';
    row.style.padding = '8px 4px';
    row.style.borderRadius = '4px';
    row.style.transition = 'background-color 0.2s ease';

    const label = document.createElement('label');
    label.htmlFor = id;
    label.innerText = labelText;
    label.style.cursor = 'pointer';
    label.style.fontWeight = '600';
    label.style.color = '#333';
    label.style.fontSize = '14px';
    label.style.flex = '1';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = id;
    checkbox.checked = initialState;
    checkbox.style.cursor = 'pointer';
    checkbox.style.width = '18px';
    checkbox.style.height = '18px';
    checkbox.style.accentColor = '#e31919'; // D&D Beyond Red accent

    checkbox.addEventListener('change', (e) => {
        onChange(e.target.checked);
        row.style.backgroundColor = e.target.checked ? '#fff5f5' : 'transparent';
    });

    row.appendChild(label);
    row.appendChild(checkbox);
    return row;
}

async function getCharacterData() {
    const charId = window.location.pathname.split('/').pop();
    if (!charId || isNaN(charId)) return null;

    try {
        const url = `https://character-service.dndbeyond.com/character/v5/character/${charId}?includeCustomItems=true`;
        const response = await fetch(url);
        const json = await response.json();
        return json.data;
    } catch (e) {
        console.warn("Failed to fetch character data:", e);
        return null;
    }
}

function checkHasMageArmor(data) {
    if (!data) return true;
    // Collect all spells from various sources
    const allSpells = [
        ...(data.classSpells || []).flatMap(cs => cs.spells || []),
        ...(data.spells?.class || []),
        ...(data.spells?.race || []),
        ...(data.spells?.feat || []),
        ...(data.spells?.item || []),
        ...(data.spells?.background || [])
    ];
    return allSpells.some(s => s.definition?.name?.toLowerCase() === 'mage armor');
}

function checkHasBladesong(data) {
    if (!data) return true;

    // Check actions
    const allActions = [
        ...(data.actions?.class || []),
        ...(data.actions?.race || []),
        ...(data.actions?.feat || []),
        ...(data.actions?.item || [])
    ];
    if (allActions.some(a => a.name?.toLowerCase().includes('bladesong'))) return true;

    // Check class features
    const allFeatures = (data.classes || []).flatMap(c => [
        ...(c.classFeatures || []).map(cf => cf.definition?.name),
        ...(c.subclassDefinition?.classFeatures || []).map(cf => cf.name)
    ]);
    if (allFeatures.some(f => f?.toLowerCase().includes('bladesong'))) return true;

    // Check feats
    if ((data.feats || []).some(f => f.definition?.name?.toLowerCase().includes('bladesong'))) return true;

    return false;
}

function checkHasWildShape(data) {
    if (!data) return true;

    // Check class features for Wild Shape
    const allFeatures = (data.classes || []).flatMap(c => [
        ...(c.classFeatures || []).map(cf => cf.definition?.name),
        ...(c.subclassDefinition?.classFeatures || []).map(cf => cf.name)
    ]);
    if (allFeatures.some(f => f?.toLowerCase().includes('wild shape'))) return true;

    // Check actions
    const allActions = [
        ...(data.actions?.class || []),
        ...(data.actions?.race || []),
        ...(data.actions?.feat || [])
    ];
    if (allActions.some(a => a.name?.toLowerCase().includes('wild shape'))) return true;

    return false;
}

async function injectToggles() {
    if (document.getElementById('dndb-toggles-container')) return;

    const charData = await getCharacterData();
    const charHasMageArmor = checkHasMageArmor(charData);
    const charHasBladesong = checkHasBladesong(charData);
    const charHasWildShape = checkHasWildShape(charData);

    // If none are present, don't show the container at all
    if (!charHasMageArmor && !charHasBladesong && !charHasWildShape) return;

    const container = document.createElement('div');
    container.id = 'dndb-toggles-container';
    container.classList.add('dndb-toggles-container');

    // UI Styling for the container box - Glassmorphism and premium feel
    Object.assign(container.style, {
        position: 'fixed',
        bottom: '30px',
        right: '30px',
        zIndex: '10000',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)',
        padding: '16px',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, sans-serif, "Segoe UI"',
        minWidth: '200px',
        borderTop: '4px solid #e31919' // D&D Beyond themed header strip
    });

    const title = document.createElement('div');
    title.innerText = 'Quick Modifiers';
    title.style.fontSize = '12px';
    title.style.fontWeight = '800';
    title.style.color = '#e31919';
    title.style.textTransform = 'uppercase';
    title.style.letterSpacing = '1px';
    title.style.marginBottom = '12px';
    container.appendChild(title);

    // Add Mage Armor Toggle ONLY if the character knows the spell
    if (charHasMageArmor) {
        container.appendChild(createToggleRow('toggle-mage-armor', 'Mage Armor (AC)', isMageArmorActive, (checked) => {
            isMageArmorActive = checked;
            calculateAndSetAC();
        }));
    }

    // Add Bladesong Toggle ONLY if the character has the feature
    if (charHasBladesong) {
        container.appendChild(createToggleRow('toggle-bladesong', 'Bladesong (AC, Speed)', isBladesongActive, (checked) => {
            isBladesongActive = checked;
            calculateAndSetAC();
            calculateAndSetSpeed();
        }));
    }

    // Add Wild Shape Toggle ONLY if the character has the feature
    if (charHasWildShape) {
        container.appendChild(createToggleRow('toggle-wild-shape', 'Wild Shape (AC)', isWildShapeActive, (checked) => {
            isWildShapeActive = checked;
            calculateAndSetAC();
            calculateAndSetTempHP(charData);
        }));
    }

    document.body.appendChild(container);
}

// Initial injection after a delay for dynamic loading
setTimeout(injectToggles, 3000);
