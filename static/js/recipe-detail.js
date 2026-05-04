// static/js/recipe-detail.js

document.addEventListener('DOMContentLoaded', () => {
    const recipeId = document.body.dataset.recipeId;
    const servingInput = document.getElementById('serving-size');
    const unitToggle = document.getElementById('unit-toggle');

    // Expanded factors for more consistent conversion [Feature: Consistent Conversion]
    const UNIT_FACTORS = {
        "g": 1,
        "mg": 0.001,
        "kg": 1000,
        "oz": 28.3495,
        "lb": 453.592,
        "ml": 1,
        "tsp": 4.92892,
        "tbsp": 14.7868,
        "cup": 240,
        "piece": 1,   // Non-convertible standard
        "pinch": 0.3  // Estimated base for math consistency
    };

    window.updateIngredients = function() {
        const newServings = parseFloat(servingInput.value) || 1;
        const originalServings = parseFloat(servingInput.dataset.originalServings);
        const targetUnit = unitToggle.value;
        const ratio = newServings / originalServings;

        // Scale Macros [Bug Fix: Nutrition Scaling]
        ['calories', 'protein', 'carbs', 'fat'].forEach(macro => {
            const el = document.getElementById(`display-${macro}`);
            if (el) {
                const originalVal = parseFloat(el.dataset.original) || 0;
                el.textContent = Math.round(originalVal * ratio);
                el.classList.add('highlight');
                setTimeout(() => el.classList.remove('highlight'), 500);
            }
        });

        // Scale Ingredients [Bug Fix: Unit Math Consistency]
        document.querySelectorAll('.ingredient-row').forEach(row => {
            const qtySpan = row.querySelector('.qty');
            const unitSpan = row.querySelector('.unit');
            
            if (!qtySpan || !unitSpan) return;

            let baseQty = parseFloat(qtySpan.dataset.originalQty) * ratio;
            let originalUnit = row.dataset.baseUnit.toLowerCase();

            // Perform conversion if target unit is supported
            if (targetUnit !== 'default' && UNIT_FACTORS[originalUnit] && UNIT_FACTORS[targetUnit]) {
                let qtyInGramsOrMl = baseQty * UNIT_FACTORS[originalUnit];
                baseQty = qtyInGramsOrMl / UNIT_FACTORS[targetUnit];
                unitSpan.textContent = targetUnit;
            } else {
                unitSpan.textContent = row.dataset.baseUnit;
            }

            qtySpan.textContent = Number(baseQty.toFixed(2));
            qtySpan.classList.add('highlight');
            setTimeout(() => qtySpan.classList.remove('highlight'), 500);
        });
    };

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

    servingInput?.addEventListener('input', window.updateIngredients);
    unitToggle?.addEventListener('change', window.updateIngredients);
});
