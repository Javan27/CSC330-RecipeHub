// static/js/recipe-detail.js

document.addEventListener('DOMContentLoaded', () => {
    const recipeId = document.body.dataset.recipeId;
    const servingInput = document.getElementById('serving-size');
    const unitToggle = document.getElementById('unit-toggle');

    // Factors for consistent mass/volume conversion
    const UNIT_FACTORS = {
        "g": 1,
        "mg": 0.001,
        "kg": 1000,
        "oz": 28.3495,
        "lb": 453.592,
        "ml": 1,
        "tsp": 4.92892,
        "tbsp": 14.7868,
        "cup": 240
    };

    // [BUG FIX]: Units that should only scale, never convert
    const NON_CONVERTIBLE_UNITS = ["piece", "pinch", "can", "bottle", "slice"];

    window.updateIngredients = function() {
        const newServings = parseFloat(servingInput.value) || 1;
        const originalServings = parseFloat(servingInput.dataset.originalServings);
        const targetUnit = unitToggle.value;
        const ratio = newServings / originalServings;

        // Scale Nutrition Macros
        ['calories', 'protein', 'carbs', 'fat'].forEach(macro => {
            const el = document.getElementById(`display-${macro}`);
            if (el) {
                const originalVal = parseFloat(el.dataset.original) || 0;
                el.textContent = Math.round(originalVal * ratio);
                el.classList.add('highlight');
                setTimeout(() => el.classList.remove('highlight'), 500);
            }
        });

        // Scale and Convert Ingredients
        document.querySelectorAll('.ingredient-row').forEach(row => {
            const qtySpan = row.querySelector('.qty');
            const unitSpan = row.querySelector('.unit');
            
            if (!qtySpan || !unitSpan) return;

            let baseQty = parseFloat(qtySpan.dataset.originalQty) * ratio;
            let originalUnit = row.dataset.baseUnit.toLowerCase();

            // Logic: Skip unit conversion for discrete items
            if (NON_CONVERTIBLE_UNITS.includes(originalUnit)) {
                unitSpan.textContent = row.dataset.baseUnit;
                qtySpan.textContent = Number(baseQty.toFixed(2));
            } 
            // Standard conversion logic for measurable units
            else if (targetUnit !== 'default' && UNIT_FACTORS[originalUnit] && UNIT_FACTORS[targetUnit]) {
                let qtyInBaseUnit = baseQty * UNIT_FACTORS[originalUnit];
                baseQty = qtyInBaseUnit / UNIT_FACTORS[targetUnit];
                unitSpan.textContent = targetUnit;
                qtySpan.textContent = Number(baseQty.toFixed(2));
            } 
            // Default: Just scale the quantity
            else {
                unitSpan.textContent = row.dataset.baseUnit;
                qtySpan.textContent = Number(baseQty.toFixed(2));
            }

            qtySpan.classList.add('highlight');
            setTimeout(() => qtySpan.classList.remove('highlight'), 500);
        });
    };

    // --- Action Functions ---

    window.deleteRecipe = async function () {
        if (confirm('Permanently delete this recipe?')) {
            const res = await fetch(`/api/recipes/${recipeId}`, { method: 'DELETE' });
            if (res.ok) window.location.href = '/';
        }
    };

    window.fork_recipe = async function () {
        const res = await fetch(`/api/recipes/${recipeId}/fork`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        if (res.ok) {
            alert('Recipe forked successfully!');
            window.location.href = '/';
        } else {
            alert('Failed to fork recipe');
        }
    };

    window.submitRating = async function () {
        const stars = document.getElementById('stars-input').value;
        const res = await fetch(`/api/recipes/${recipeId}/rate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stars: parseInt(stars) })
        });
        if (res.ok) location.reload();
    };

    window.submitComment = async function () {
        const text = document.getElementById('new-comment').value;
        if (!text.trim()) return;
        const res = await fetch(`/api/recipes/${recipeId}/comment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
        if (res.ok) location.reload();
    };

    window.toggleEdit = function () {
        const display = document.getElementById('rating-display');
        const form = document.getElementById('rating-form');
        display.style.display = display.style.display === 'none' ? 'block' : 'none';
        form.style.display = form.style.display === 'none' ? 'block' : 'none';
    };

    // Event Listeners for Real-Time Updates
    servingInput?.addEventListener('input', window.updateIngredients);
    unitToggle?.addEventListener('change', window.updateIngredients);
});
