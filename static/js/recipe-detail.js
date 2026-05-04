// static/js/recipe-detail.js

document.addEventListener('DOMContentLoaded', () => {
    const recipeId = document.body.dataset.recipeId;

    window.deleteRecipe = async function () {
        if (confirm('Delete?')) {
            const res = await fetch(`/api/recipes/${recipeId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                window.location.href = '/';
            }
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

        await fetch(`/api/recipes/${recipeId}/rate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stars: parseInt(stars) })
        });

        location.reload();
    };

    window.submitComment = async function () {
        const text = document.getElementById('new-comment').value;

        if (!text.trim()) return;

        await fetch(`/api/recipes/${recipeId}/comment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });

        location.reload();
    };

    window.toggleEdit = function () {
        const display = document.getElementById('rating-display');
        const form = document.getElementById('rating-form');

        display.style.display = display.style.display === 'none' ? 'block' : 'none';
        form.style.display = form.style.display === 'none' ? 'block' : 'none';
    };
});