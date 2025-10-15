async function analyzeSentiment() { 
  const review = document.getElementById("reviewInput").value.trim();
  const loader = document.getElementById("loader");
  const resultCard = document.getElementById("resultCard");
  const result = document.getElementById("result");
  const confidence = document.getElementById("confidence");
  const suggestion = document.getElementById("suggestion");
  const timestampEl = document.getElementById("timestamp");
  const barContainer = document.getElementById("barGraph");

  if (!review) {
    resultCard.classList.remove("hidden");
    result.innerText = "⚠️ Please enter a review first!";
    result.style.color = "red";
    confidence.innerText = "";
    suggestion.innerText = "";
    timestampEl.innerText = "";
    barContainer.innerHTML = "";
    return;
  }

  loader.classList.remove("hidden");
  resultCard.classList.add("hidden");

  try {
    const response = await fetch("http://127.0.0.1:5000/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ review: review })
    });

    const data = await response.json();

    setTimeout(() => {
      loader.classList.add("hidden");
      resultCard.classList.remove("hidden");

      if (!response.ok) {
        result.style.color = "red";
        result.innerText = `${data.error || "Invalid review"}`;
        confidence.innerText = "";
        suggestion.innerText = "";
        timestampEl.innerText = "";
        barContainer.innerHTML = "";
        return;
      }

      if (data.sentiment === "Positive") {
        result.style.color = "green";
        result.innerText = "😀 Positive Review";
      } else if (data.sentiment === "Negative") {
        result.style.color = "red";
        result.innerText = "😡 Negative Review";
      } else {
        result.style.color = "orange";
        result.innerText = "😐 Neutral Review";
      }

      confidence.innerText = `Confidence: ${data.confidence?.toFixed(2) || 0}%`;
      suggestion.innerText = `💡 Message: ${data.message || ""}`;
      timestampEl.innerText = `🕒 Time: ${data.timestamp || ""}`;

      // ----- BAR GRAPH -----
      barContainer.innerHTML = "";
      if (data.probabilities) {
        for (const [label, prob] of Object.entries(data.probabilities)) {
          const barWrapper = document.createElement("div");
          barWrapper.classList.add("bar-wrapper");

          const labelEl = document.createElement("span");
          labelEl.innerText = `${label}: ${prob}%`;
          labelEl.style.display = "inline-block";
          labelEl.style.width = "120px";

          const bar = document.createElement("div");
          bar.classList.add("bar");
          bar.style.width = "0%"; // start animation
          bar.style.background = label === "Positive" ? "green" : 
                                 label === "Negative" ? "red" : "orange";
          bar.style.height = "20px";
          bar.style.margin = "5px 0";
          bar.style.transition = "width 1s ease-in-out";

          barWrapper.appendChild(labelEl);
          barWrapper.appendChild(bar);
          barContainer.appendChild(barWrapper);

          // Animate after render
          setTimeout(() => {
            bar.style.width = prob + "%";
          }, 100);
        }
      }
    }, 1000);

  } catch (error) {
    loader.classList.add("hidden");
    resultCard.classList.remove("hidden");
    result.style.color = "red";
    result.innerText = "❌ Error: Could not connect to backend!";
    confidence.innerText = "";
    suggestion.innerText = "";
    timestampEl.innerText = "";
    barContainer.innerHTML = "";
  }
}

// nav bar typing
document.addEventListener("DOMContentLoaded", () => {
  const text = "🍽️ Sentiment Analyzer on Restaurant Reviews";
  const typingElement = document.getElementById("typing-text");
  let index = 0;

  function typeWriter() {
    if (index < text.length) {
      typingElement.textContent += text.charAt(index);
      index++;
      setTimeout(typeWriter, 80);
    } 
  }
  typeWriter();
});

// history page
document.addEventListener("DOMContentLoaded", () => {
  const historyBtn = document.querySelector(".navbar-right a[href$='history']");
  const historyContainer = document.getElementById("historyContainer");
  const appContainer = document.querySelector(".app-container");
  const analyzeContainer = document.getElementById("analyzeContainer");
  const backBtn = document.getElementById("backBtn");

  // Show history when navbar button clicked
  historyBtn.addEventListener("click", async (e) => {
    e.preventDefault(); // Prevent opening new tab
    appContainer.style.display = "none";
    analyzeContainer.style.display = "none"; // hide graph when history is open
    historyContainer.classList.remove("hidden");

    try {
      const response = await fetch("http://127.0.0.1:5000/history");
      const data = await response.json();

      const tbody = document.querySelector("#historyTable tbody");
      tbody.innerHTML = "";

      data.forEach((item, index) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${index + 1}</td>
          <td class="review-cell">${item.review}</td>
          <td>${item.sentiment}</td>
          <td>${item.confidence.toFixed(2)}</td>
          <td>${item.timestamp}</td>
        `;

        tbody.appendChild(row);
      });
    } catch (error) {
      console.error("Error fetching history:", error);
      historyContainer.innerHTML = "<p style='color:red;'>Failed to load history.</p>";
    }
  });

  // Back to analyzer
  backBtn.addEventListener("click", () => {
    historyContainer.classList.add("hidden");
    analyzeContainer.style.display = "none"; // also hide graph when back
    appContainer.style.display = "block";
  });
});

// analyze graph
document.addEventListener("DOMContentLoaded", () => {
  const analyzeBtn = document.getElementById("analyzeBtn");
  const analyzeContainer = document.getElementById("analyzeContainer");
  const appContainer = document.querySelector(".app-container");
  const historyContainer = document.getElementById("historyContainer");
  const backAnalyzeBtn = document.getElementById("backAnalyzeBtn");
  let chartInstance = null;

  analyzeBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    // Hide other containers
    appContainer.style.display = "none";
    historyContainer.classList.add("hidden");
    analyzeContainer.style.display = "block";  // show graph only here

    try {
      const response = await fetch("http://127.0.0.1:5000/history");
      const data = await response.json();

      // Count sentiments
      const sentimentCounts = { Positive: 0, Negative: 0, Neutral: 0 };
      data.forEach(item => {
        if (sentimentCounts[item.sentiment] !== undefined) {
          sentimentCounts[item.sentiment]++;
        }
      });

      // Chart.js
      const ctx = document.getElementById("reviewChart").getContext("2d");

      if(chartInstance) {
        chartInstance.destroy(); // Remove old chart if exists
      }

      chartInstance = new Chart(ctx, {
        type: "bar",
        data: {
          labels: ["Positive", "Negative", "Neutral"],
          datasets: [{
            label: "Number of Reviews",
            data: [
              sentimentCounts.Positive,
              sentimentCounts.Negative,
              sentimentCounts.Neutral
            ],
            backgroundColor: ["green", "red", "orange"]
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false },
            title: { display: true, text: "Sentiment Analysis of All Reviews" }
          },
          animation: {
            duration: 3000,
            easing: "easeInOutQuart",
            onProgress: function(animation) {
              const dataset = this.data.datasets[0].data;
              const totalSteps = animation.numSteps;
              const currentStep = animation.currentStep;

              dataset.forEach((value, index) => {
                const increment = value / totalSteps;
                dataset[index] = Math.min(value, increment * currentStep);
              });
            }
          }
        }
      });

    } catch (error) {
      console.error("Error fetching data for analysis:", error);
      analyzeContainer.innerHTML += "<p style='color:red;'>Failed to load analysis.</p>";
    }
  });

  backAnalyzeBtn.addEventListener("click", () => {
    analyzeContainer.style.display = "none";   // hide graph
    appContainer.style.display = "block";      // back to main
  });
});



// search section
// ===================== NAVIGATION HANDLING =====================
const appContainer = document.querySelector(".app-container");
const analyzeContainer = document.getElementById("analyzeContainer");
const historyContainer = document.getElementById("historyContainer");
const searchContainer = document.getElementById("searchContainer");

const searchBtn = document.getElementById("searchBtn");
const backSearchBtn = document.getElementById("backSearchBtn");

// Hide all other sections
function hideAllSections() {
  appContainer.style.display = "none";
  analyzeContainer.classList.add("hidden");
  historyContainer.classList.add("hidden");
  searchContainer.style.display = "none";
}

// Show Search section when button clicked
searchBtn.addEventListener("click", () => {
  hideAllSections();
  searchContainer.style.display = "block";
  searchContainer.classList.add("active");
});

// Back button returns to main analyzer
backSearchBtn.addEventListener("click", () => {
  searchContainer.style.display = "none";
  appContainer.style.display = "block";
});


// ===================== SEARCH FUNCTIONALITY =====================
const searchForm = document.getElementById("searchForm");
const searchResults = document.getElementById("searchResults");

let map; // Global map variable

searchForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const city = document.getElementById("cityInput").value.trim();
  const restaurantName = document.getElementById("restaurantInput").value.trim();

  if (!city || !restaurantName) {
    alert("⚠️ Please enter both city and restaurant name!");
    return;
  }

  searchResults.innerHTML = "<p>🔍 Searching for restaurants...</p>";

  try {
    // Example restaurant data (offline)
    const restaurants = [
      { 
        name: `${restaurantName} Paradise`, 
        food: "North Indian, Chinese", 
        service: "Excellent ambience, friendly staff, and quick service.", 
        rating: 4.7, 
        address: `12 MG Road, ${city}`, 
        location: [12.9716, 77.5946] 
      },
      { 
        name: `${restaurantName} Bistro`, 
        food: "Continental, Italian", 
        service: "Cozy place with great food quality, but slightly slow service.", 
        rating: 4.3, 
        address: `45 Brigade Road, ${city}`, 
        location: [12.9731, 77.5954] 
      },
      { 
        name: `${restaurantName} Delight`, 
        food: "Fast Food, Beverages", 
        service: "Perfect for snacks and hangouts, quick counter service.", 
        rating: 4.1, 
        address: `22 Church Street, ${city}`, 
        location: [12.9742, 77.5928] 
      },
      { 
        name: `${restaurantName} Hub`, 
        food: "South Indian, Desserts", 
        service: "Authentic flavors with clean and calm dining space.", 
        rating: 4.5, 
        address: `8 Residency Road, ${city}`, 
        location: [12.9722, 77.5975] 
      }
    ];

    // Clear results
    searchResults.innerHTML = "";

    // Display restaurant cards with animation
    restaurants.forEach((r, index) => {
      setTimeout(() => {
        const div = document.createElement("div");
        div.className = "restaurant-card";
        div.style.animation = "fadeIn 0.6s ease-in-out";
        div.innerHTML = `
          <h3>${r.name}</h3>
          <p><strong>📍 Address:</strong> ${r.address}</p>
          <p><strong>🍴 Food:</strong> ${r.food}</p>
          <p><strong>🛎️ Service:</strong> ${r.service}</p>
          <div class="stars">${getStarHTML(r.rating)}</div>
          <p><strong>⭐ Rating:</strong> ${r.rating.toFixed(1)}/5</p>
        `;
        searchResults.appendChild(div);
      }, index * 200);
    });

    // Initialize or Reset Map safely
    setTimeout(() => {
      if (map) {
        map.remove(); // reset map before reloading
      }
      map = L.map("map").setView(restaurants[0].location, 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
      }).addTo(map);

      // Add markers
      restaurants.forEach((r) => {
        L.marker(r.location)
          .addTo(map)
          .bindPopup(`<b>${r.name}</b><br>${r.address}<br>${r.food}<br>⭐ ${r.rating}`);
      });
    }, 600);

  } catch (error) {
    console.error(error);
    searchResults.innerHTML = `<p style="color:red;">❌ Error loading restaurant data.</p>`;
  }
});


// ===================== STAR ANIMATION FUNCTION =====================
function getStarHTML(rating) {
  const stars = Math.round(rating);
  let html = "";
  for (let i = 0; i < stars; i++) {
    html += `<span class="star-bubble">⭐</span>`;
  }
  return html;
}
