// ==UserScript==
// @name         Image Modal Viewer
// @namespace    http://tampermonkey.net/
// @version      1.5 // Incrementing version to reflect this new feature (download all)
// @description Ouvre une modal avec les images uniques de la page en grille, téléchargeable par clic. Styles améliorés. Ajoute une pop-up de prévisualisation au survol dans la modale et un bouton "Tout télécharger".
// @match        *://*/*
// @grant        GM_download
// ==/UserScript==

(function() {
    'use strict';

  //PRESS CTRL + i

    let hoverTimeout; // Pour le délai de la pop-up de prévisualisation
    let previewPopup; // Pour l'élément HTML de la pop-up de prévisualisation

    // Fonction pour afficher la pop-up de prévisualisation
    function showPreviewPopup(imgSrc, x, y) {
        // Supprime la pop-up existante si elle y est
        if (previewPopup) {
            previewPopup.remove();
        }

        previewPopup = document.createElement('div');
        previewPopup.id = 'image-preview-popup';
        previewPopup.style.cssText = `
            position: fixed;
            z-index: 10001; /* Doit être au-dessus de la modale (z-index: 10000) */
            border: 2px solid #007bff;
            box-shadow: 0 4px 15px rgba(0,0,0,0.5);
            background-color: rgba(255, 255, 255, 0.95);
            padding: 8px;
            max-width: 80vw; /* Limite la largeur de la pop-up à 80% de la fenêtre */
            max-height: 80vh; /* Limite la hauteur de la pop-up à 80% de la fenêtre */
            overflow: auto; /* Ajoute des barres de défilement si nécessaire */
            border-radius: 8px;
            backdrop-filter: blur(4px); /* Effet de flou derrière la pop-up */
        `;

        const img = document.createElement('img');
        img.src = imgSrc;
        img.style.cssText = `
            max-width: 100%;
            height: auto;
            display: block; /* Supprime l'espace sous l'image */
            border-radius: 4px;
        `;

        previewPopup.appendChild(img);
        document.body.appendChild(previewPopup);

        // Positionne la pop-up
        let popupX = x + 25; // Décalage pour ne pas masquer le curseur
        let popupY = y + 25;

        // Ajuster la position si la pop-up sort de l'écran
        // Vérifie si la pop-up déborde à droite
        if (popupX + previewPopup.offsetWidth > window.innerWidth) {
            popupX = x - previewPopup.offsetWidth - 25; // Affiche à gauche
        }
        // Vérifie si la pop-up déborde en bas
        if (popupY + previewPopup.offsetHeight > window.innerHeight) {
            popupY = window.innerHeight - previewPopup.offsetHeight - 15; // Affiche plus haut
        }
        // Assure que la pop-up ne sort pas par le haut
        if (popupY < 0) {
            popupY = 10;
        }
        // Assure que la pop-up ne sort pas par la gauche
        if (popupX < 0) {
            popupX = 10;
        }

        previewPopup.style.left = popupX + 'px';
        previewPopup.style.top = popupY + 'px';
    }

    // Fonction pour masquer la pop-up de prévisualisation
    function hidePreviewPopup() {
        clearTimeout(hoverTimeout); // Annule le timer s'il était en cours
        if (previewPopup) {
            previewPopup.remove();
            previewPopup = null;
        }
    }

    // Fonction pour obtenir un nom de fichier propre à partir d'une URL
    function getFilenameFromUrl(url) {
        const urlObj = new URL(url);
        // Utilise le chemin du fichier, puis supprime les paramètres de requête et les ancres
        const filename = urlObj.pathname.substring(urlObj.pathname.lastIndexOf('/') + 1)
                                .split('?')[0].split('#')[0];
        // Si le nom de fichier est vide ou générique, utilise une alternative
        return filename || 'image_download.jpg';
    }

    // Function to create and display the modal
    function showModal(images) {
        // Create the modal
        const modal = document.createElement("div");
        modal.id = "image-modal-viewer";
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.9);
            z-index: 10000;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 20px;
            box-sizing: border-box;
            font-family: sans-serif;
        `;

        // Create the button container
        const buttonContainer = document.createElement("div");
        buttonContainer.style.cssText = `
            display: flex;
            gap: 15px; /* Espace entre les boutons */
            margin-bottom: 25px;
        `;
        modal.appendChild(buttonContainer);

        // Create the close button
        const closeButton = document.createElement("button");
        closeButton.innerText = "Fermer";
        closeButton.style.cssText = `
            padding: 12px 25px;
            background-color: #ff4d4d;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
            transition: background-color 0.3s ease;
        `;
        closeButton.onmouseover = () => closeButton.style.backgroundColor = "#e60000";
        closeButton.onmouseout = () => closeButton.style.backgroundColor = "#ff4d4d";
        closeButton.onclick = () => {
            document.body.removeChild(modal);
            hidePreviewPopup(); // S'assurer que la pop-up de prévisualisation est aussi fermée
        };
        buttonContainer.appendChild(closeButton);

        // Create the "Download All" button
        const downloadAllButton = document.createElement("button");
        downloadAllButton.innerText = `Tout télécharger (${images.length})`;
        downloadAllButton.style.cssText = `
            padding: 12px 25px;
            background-color: #4CAF50; /* Green */
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
            transition: background-color 0.3s ease;
        `;
        downloadAllButton.onmouseover = () => downloadAllButton.style.backgroundColor = "#45a049";
        downloadAllButton.onmouseout = () => downloadAllButton.style.backgroundColor = "#4CAF50";
        downloadAllButton.onclick = () => {
            if (confirm(`Voulez-vous vraiment télécharger les ${images.length} images ?`)) {
                images.forEach((src, index) => {
                    const filename = getFilenameFromUrl(src);
                    // GM_download supporte un deuxième argument pour le nom du fichier
                    GM_download(src, `telechargement_${index + 1}_${filename}`);
                });
            }
        };
        buttonContainer.appendChild(downloadAllButton);

        // Create the image grid container
        const gridContainer = document.createElement("div");
        gridContainer.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 15px;
            width: 90%;
            max-width: 1300px;
            justify-items: center;
        `;
        modal.appendChild(gridContainer);

        // Add images to the grid
        images.forEach(src => {
            const img = document.createElement("img");
            img.src = src;
            img.style.cssText = `
                width: 100%;
                height: 120px; /* Fixed height for better grid alignment */
                object-fit: cover; /* Ensures images cover the area without distortion */
                cursor: pointer;
                border-radius: 8px;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
                transition: transform 0.2s ease, box-shadow 0.2s ease;
            `;
            img.onmouseover = (e) => {
                img.style.transform = "scale(1.08)";
                img.style.boxShadow = "0 6px 12px rgba(0, 0, 0, 0.4)";

                const imgSrc = e.target.src;
                const mouseX = e.clientX;
                const mouseY = e.clientY;

                // Démarre le timer pour 1 seconde
                hoverTimeout = setTimeout(() => {
                    showPreviewPopup(imgSrc, mouseX, mouseY);
                }, 1000); // 1000 millisecondes = 1 seconde
            };
            img.onmouseout = () => {
                img.style.transform = "scale(1)";
                img.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.3)";
                hidePreviewPopup(); // Masque la pop-up quand la souris quitte l'image
            };
            img.onclick = () => {
                // Generate a more unique filename for download
                const filename = getFilenameFromUrl(src);
                GM_download(src, filename);
            };
            gridContainer.appendChild(img);
        });

        // Add the modal to the document
        document.body.appendChild(modal);

        // Listen for mouseout on the modal itself to ensure preview popup is hidden if mouse leaves modal
        modal.addEventListener('mouseout', function(e) {
            // Check if the mouse leaves the modal (but not just moving from one image to another within the modal)
            if (!modal.contains(e.relatedTarget) && previewPopup) {
                hidePreviewPopup();
            }
        });

        // Close modal with Escape key
        document.addEventListener("keydown", function(e) {
            if (e.key === "Escape") {
                const currentModal = document.getElementById("image-modal-viewer");
                if (currentModal && currentModal.parentNode) {
                    currentModal.parentNode.removeChild(currentModal);
                    hidePreviewPopup(); // S'assurer que la pop-up de prévisualisation est aussi fermée
                }
            }
        }, { once: true });
    }

    // Function to get all unique images from the page
    function getAllUniqueImages() {
        const uniqueImageSrcs = new Set();
        // Select all img elements
        const images = document.querySelectorAll("img");

        images.forEach(imgElement => {
            // Ensure it's an actual HTMLImageElement and has a non-empty src
            if (imgElement instanceof HTMLImageElement && imgElement.src) {
                // Normalize the URL to avoid duplicates due to query parameters/hashes
                // For example, "image.jpg?v=1" and "image.jpg" are treated as different by default.
                // You might want to remove query parameters and hashes for better uniqueness.
                const cleanSrc = new URL(imgElement.src, window.location.href).href;
                uniqueImageSrcs.add(cleanSrc);
            }
        });
        return Array.from(uniqueImageSrcs);
    }

    // Listen for the keyboard shortcut (Ctrl + I) to open the modal
    document.addEventListener("keydown", function(e) {
        if (e.ctrlKey && (e.key === "i" || e.key === "I")) {
            e.preventDefault(); // Prevent default browser action for Ctrl+I (e.g., inspect element)
            const images = getAllUniqueImages();
            if (images.length > 0) {
                showModal(images);
            } else {
                alert("Aucune image trouvée sur cette page.");
            }
        }
    });
})();
