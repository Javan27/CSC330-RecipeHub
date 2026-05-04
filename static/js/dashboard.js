// static/js/dashboard.js

document.addEventListener('DOMContentLoaded', () => {
    const currentUsername = window.APP_DATA?.username;

    const userEl = document.getElementById('current-user');
    if (userEl) userEl.innerText = currentUsername;

    function renderGrid(recipes) {
        const originalGrid = document.getElementById('original-recipes-grid');
        const forkedGrid = document.getElementById('forked-recipes-grid');

        if (!originalGrid || !forkedGrid) return;

        originalGrid.innerHTML = '';
        forkedGrid.innerHTML = '';

        recipes.forEach(recipe => {
            const card = document.createElement('div');
            card.className = 'recipe-card card';

            card.innerHTML = `
                <h3><a class="recipe-link" href="/recipe/${recipe.id}">${recipe.name}</a></h3>
                <p><strong>Servings:</strong> ${recipe.servings}</p>
                <p><strong>Rating:</strong> ${recipe.avg_rating}</p>
                ${recipe.forked_from 
                    ? `<p class="muted-text">Forked from: ${recipe.forked_from}</p>`
                    : `<p class="muted-text">Original Recipe</p>`
                }
            `;

            if (recipe.forked_from) {
                forkedGrid.appendChild(card);
            } else {
                originalGrid.appendChild(card);
            }
        });
    }

    async function loadDashboard() {
        const res = await fetch('/api/recipes');
        if (res.ok) {
            const data = await res.json();
            renderGrid(data);
        }
    }

    document.getElementById('add-ingredient-btn')?.addEventListener('click', () => {
        const container = document.getElementById('ingredient-container');

        const newRow = document.createElement('div');
        newRow.className = 'ingredient-row form-row';

        newRow.innerHTML = `
            <input type="text" class="form-input ing-qty" placeholder="Qty">
            <select class="form-select ing-unit">
                <option value="">Unit</option>
                <option value="tsp">Teaspoon</option>
                <option value="tbsp">Tablespoon</option>
                <option value="cup">Cup</option>
                <option value="g">Grams</option>
                <option value="oz">Ounces</option>
                <option value="ml">Milliliters</option>
                <option value="lb">Pounds</option>
                <option value="pinch">Pinch</option>
                <option value="piece">Piece</option>
            </select>
            <input type="text" class="form-input ing-name" placeholder="Ingredient Name">
        `;

        container.appendChild(newRow);
    });

    document.getElementById('btn-create-recipe')?.addEventListener('click', async () => {
        const nameEl = document.getElementById('new-recipe-name');
        const servingEl = document.getElementById('new-serving-size');
        const instructionsEl = document.getElementById('new-instructions');
        const tagsEl = document.getElementById('new-tags');
        const isPublicEl = document.getElementById('new-is-public');

        if (!nameEl.value.trim()) return alert('Recipe name cannot be blank!');

        const rows = document.querySelectorAll('.ingredient-row');

        const ingredients = Array.from(rows).map(row => ({
            quantity: row.querySelector('.ing-qty').value,
            unit: row.querySelector('.ing-unit').value,
            name: row.querySelector('.ing-name').value
        })).filter(ing => ing.name.trim() !== "");

        const response = await fetch('/api/recipes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: nameEl.value,
                servings: servingEl.value,
                instructions: instructionsEl.value,
                ingredients: ingredients,
                tags: tagsEl.value,
                is_public: isPublicEl.checked
            })
        });

        if (response.ok) {
            nameEl.value = '';
            servingEl.value = '1';
            instructionsEl.value = '';
            tagsEl.value = '';

            loadDashboard();
        } else {
            const err = await response.json();
            alert(err.error || 'Failed to create recipe');
        }
    });

    loadDashboard();
});