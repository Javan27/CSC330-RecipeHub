// static/js/dashboard.js

document.addEventListener('DOMContentLoaded', () => {
    const currentUsername = window.APP_DATA?.username;

    // Display current username on dashboard
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

            const rating = recipe.avg_rating === "Not yet rated" ? "Not yet rated" : `${recipe.avg_rating} ⭐`;

            card.innerHTML = `
                <h3><a class="recipe-link" href="/recipe/${recipe.id}">${recipe.name}</a></h3>
                <p><strong>Servings:</strong> ${recipe.servings}</p>
                <p><strong>Rating:</strong> ${rating}</p>
                <div style="margin: 10px 0;">
                    <a href="/edit_recipe/${recipe.id}"><button class="btn btn-secondary" type="button">Edit Recipe</button></a>
                </div>
                ${recipe.forked_from 
                    ? `<p class="recipe-meta" style="font-style: italic;">Forked from: ${recipe.forked_from}</p>`
                    : `<p class="recipe-meta" style="font-weight: bold; color: var(--orange);">Original Recipe</p>`
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

    // [Bug Fix: Fixed Alignment and Unit List for Dynamic Rows]
    document.getElementById('add-ingredient-btn')?.addEventListener('click', () => {
        const container = document.getElementById('ingredient-container');

        const newRow = document.createElement('div');
        newRow.className = 'ingredient-row form-row';
        newRow.style.display = 'flex';
        newRow.style.gap = '10px';
        newRow.style.marginBottom = '10px';

        newRow.innerHTML = `
            <input class="form-input ing-qty" type="text" placeholder="Qty" style="width: 80px;">
            <select class="form-select ing-unit" style="width: 130px;">
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
            <input class="form-input ing-name" type="text" placeholder="Ingredient Name" style="flex: 1;">
        `;

        container.appendChild(newRow);
    });

    document.getElementById('btn-create-recipe')?.addEventListener('click', async () => {
        const nameEl = document.getElementById('new-recipe-name');
        const servingEl = document.getElementById('new-serving-size');
        const instructionsEl = document.getElementById('new-instructions');
        const tagsEl = document.getElementById('new-tags');
        const isPublicEl = document.getElementById('new-is-public');
        
        const calEl = document.getElementById('new-calories');
        const protEl = document.getElementById('new-protein');
        const carbEl = document.getElementById('new-carbs');
        const fatEl = document.getElementById('new-fat');

        if (!nameEl.value.trim()) return alert('Recipe name cannot be blank!');

        const rows = document.querySelectorAll('.ingredient-row');
        const ingredients = [];
        let hasIncompleteIngredient = false;

        rows.forEach(row => {
            const name = row.querySelector('.ing-name').value.trim();
            const unit = row.querySelector('.ing-unit').value;
            const quantity = row.querySelector('.ing-qty').value.trim();

            // If any field is filled, all must be filled (name and unit required)
            if (name || quantity || unit) {
                if (!name || !unit) {
                    hasIncompleteIngredient = true;
                } else {
                    ingredients.push({ quantity: quantity || "1", unit, name });
                }
            }
        });

        // [Bug Fix: Prevention of empty ingredient list]
        if (ingredients.length === 0) {
            return alert('You must add at least one valid ingredient (Name and Unit required)!');
        }

        if (hasIncompleteIngredient) {
            return alert('One or more ingredients are missing a name or a unit.');
        }

        const response = await fetch('/api/recipes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: nameEl.value,
                servings: servingEl.value,
                instructions: instructionsEl.value,
                ingredients: ingredients,
                tags: tagsEl.value,
                is_public: isPublicEl.checked,
                calories: parseInt(calEl.value) || 0,
                protein: parseInt(protEl.value) || 0,
                carbs: parseInt(carbEl.value) || 0,
                fat: parseInt(fatEl.value) || 0
            })
        });

        if (response.ok) {
            // Reset form
            nameEl.value = '';
            servingEl.value = '1';
            instructionsEl.value = '';
            tagsEl.value = '';
            calEl.value = '0';
            protEl.value = '0';
            carbEl.value = '0';
            fatEl.value = '0';
            
            const container = document.getElementById('ingredient-container');
            container.innerHTML = `
                <p class="section-label"><strong>Ingredients (Name and Unit Required):</strong></p>
                <div class="ingredient-row form-row" style="display: flex; gap: 10px; margin-bottom: 10px;">
                    <input class="form-input ing-qty" type="text" placeholder="Qty" style="width: 80px;">
                    <select class="form-select ing-unit" style="width: 130px;">
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
                    <input class="form-input ing-name" type="text" placeholder="Ingredient Name" style="flex: 1;">
                </div>`;

            loadDashboard();
        } else {
            const err = await response.json();
            alert(err.error || 'Failed to create recipe');
        }
    });

    loadDashboard();
});
