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
// ===================== Analyze Graph Section =====================
// ===================== Analyze Graph Section =====================
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

    // Show analyze container smoothly
    analyzeContainer.style.display = "block";
    setTimeout(() => analyzeContainer.classList.add("show"), 10);

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

      // Prepare chart data
      const labels = ["Positive", "Negative", "Neutral"];
      const values = [
        sentimentCounts.Positive,
        sentimentCounts.Negative,
        sentimentCounts.Neutral
      ];
      const colors = ["green", "red", "orange"];

      // Destroy previous chart if exists
      if (chartInstance) chartInstance.destroy();

      const ctx = document.getElementById("reviewChart").getContext("2d");
      chartInstance = new Chart(ctx, {
        type: "bar",
        data: {
          labels: labels,
          datasets: [{
            label: "Number of Reviews",
            data: [0, 0, 0], // start from 0
            backgroundColor: colors
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false },
            title: { display: true, text: "Sentiment Analysis of All Reviews" }
          },
          animation: { duration: 0 }, // disable default animation
          scales: {
            y: { beginAtZero: true }
          }
        }
      });

      // Smooth sequential bar animation using requestAnimationFrame
      function animateBars(chart, finalValues, index = 0) {
        if (index >= finalValues.length) return; // stop when all bars done

        let current = 0;
        const duration = 1500; // 1.5 seconds per bar
        const startTime = performance.now();

        function animate(time) {
          const elapsed = time - startTime;
          const progress = Math.min(elapsed / duration, 1); // 0 → 1
          current = finalValues[index] * progress;
          chart.data.datasets[0].data[index] = current;
          chart.update();

          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            // animate next bar
            animateBars(chart, finalValues, index + 1);
          }
        }

        requestAnimationFrame(animate);
      }

      // Start the animation
      animateBars(chartInstance, values);

    } catch (error) {
      console.error("Error fetching data:", error);
      analyzeContainer.innerHTML += "<p style='color:red;'>Failed to load analysis.</p>";
    }
  });

  // Back button to hide container smoothly
  backAnalyzeBtn.addEventListener("click", () => {
    analyzeContainer.classList.remove("show");
    setTimeout(() => {
      analyzeContainer.style.display = "none";
      appContainer.style.display = "block";
    }, 600);
  });
});



// ===================== NAVIGATION HANDLING =====================
// ===================== NAVIGATION HANDLING =====================
const appContainer = document.querySelector(".app-container");
const analyzeContainer = document.getElementById("analyzeContainer");
const historyContainer = document.getElementById("historyContainer");
const searchContainer = document.getElementById("searchContainer");

const searchBtn = document.getElementById("searchBtn");
const backSearchBtn = document.getElementById("backSearchBtn");

function hideAllSections() {
  appContainer.style.display = "none";
  analyzeContainer.classList.add("hidden");
  historyContainer.classList.add("hidden");
  searchContainer.style.display = "none";
}

searchBtn.addEventListener("click", () => {
  hideAllSections();
  searchContainer.style.display = "block";
  searchContainer.classList.add("active");
});

backSearchBtn.addEventListener("click", () => {
  searchContainer.style.display = "none";
  appContainer.style.display = "block";
});

// ===================== SEARCH FUNCTIONALITY =====================
const searchForm = document.getElementById("searchForm");
const searchResults = document.getElementById("searchResults");
const searchLoader = document.getElementById("searchLoader");

let map; // Global map

searchForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const city = document.getElementById("cityInput").value.trim();
  const restaurantName = document.getElementById("restaurantInput").value.trim();

  // Input validation
  if (!city) {
    searchResults.innerHTML = `<p style="color:red;">⚠️ Please enter a city name!</p>`;
    return;
  }

  const invalidPattern = /[^a-zA-Z\s]/;
  if ((invalidPattern.test(city) || city.length < 2) ||
      (restaurantName && (invalidPattern.test(restaurantName) || restaurantName.length < 2))) {
    searchResults.innerHTML = `<p style="color:red;">❌ Invalid city or restaurant name! Please try again.</p>`;
    return;
  }

  // Show loader
  searchResults.innerHTML = "";
  searchLoader.classList.remove("hidden");

  try {
    // 1️⃣ Get city coordinates
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(city)}&country=India&format=json&limit=1`
    );
    const geoData = await geoRes.json();

    if (!geoData.length) {
      searchLoader.classList.add("hidden");
      searchResults.innerHTML = `<p style="color:red;">⚠️ City "${city}" not found in India.</p>`;
      if (map) map.remove();
      return;
    }

    const { lat, lon } = geoData[0];

    // 2️⃣ Fetch restaurants from Overpass API (GET request, smaller radius)
    const overpassQuery = `
      [out:json][timeout:25];
      (
        node["amenity"="restaurant"](around:2000,${lat},${lon});
        way["amenity"="restaurant"](around:2000,${lat},${lon});
        relation["amenity"="restaurant"](around:2000,${lat},${lon});
      );
      out center 50;
    `;

    const url = "https://overpass-api.de/api/interpreter?data=" + encodeURIComponent(overpassQuery);
    const overpassRes = await fetch(url);
    const data = await overpassRes.json();

    if (!data.elements || data.elements.length === 0) {
      searchLoader.classList.add("hidden");
      searchResults.innerHTML = `<p style="color:red;">⚠️ No restaurants found in "${city}".</p>`;
      if (map) map.remove();
      return;
    }

    // Prepare restaurant list with full address
    let restaurants = data.elements.map((el) => {
      const tags = el.tags || {};
      const parts = [
        tags["addr:housenumber"] || "",
        tags["addr:street"] || "",
        tags["addr:suburb"] || "",
        tags["addr:city"] || city,
        tags["addr:postcode"] || ""
      ];
      const fullAddress = parts.filter(p => p).join(", ");

      return {
        name: tags.name || "Unnamed Restaurant",
        address: fullAddress,
        food: tags.cuisine ? tags.cuisine.replace(/_/g, " ") : "Various Cuisines",
        rating: (Math.random() * 1.5 + 3.5).toFixed(1),
        location: [el.lat || el.center.lat, el.lon || el.center.lon],
      };
    });

    // Filter by restaurant name only if input is given
    if (restaurantName) {
      restaurants = restaurants.filter((r) =>
        r.name.toLowerCase().includes(restaurantName.toLowerCase())
      );

      if (restaurants.length === 0) {
        searchLoader.classList.add("hidden");
        searchResults.innerHTML = `<p style="color:red;">⚠️ No restaurants named "${restaurantName}" found in "${city}".</p>`;
        if (map) map.remove();
        return;
      }
    }

    // Display results
    showRestaurants(restaurants, city);

  } catch (err) {
    searchLoader.classList.add("hidden");
    console.error(err);
    searchResults.innerHTML = `<p style="color:red;">❌ Error loading restaurant data. Please try again later.</p>`;
  }
});

// ===================== DISPLAY RESULTS + MAP =====================
function showRestaurants(list, city) {
  searchLoader.classList.add("hidden");
  searchResults.innerHTML = "";

  list.slice(0, 20).forEach((r, index) => {
    setTimeout(() => {
      const div = document.createElement("div");
      div.className = "restaurant-card";
      div.style.animation = "fadeIn 0.6s ease-in-out";
      div.innerHTML = `
        <h3>${r.name}</h3>
        <p><strong>📍 Address:</strong> ${r.address}</p>
        <p><strong>🍴 Food:</strong> ${r.food}</p>
        <div class="stars">${getStarHTML(r.rating)}</div>
        <p><strong>⭐ Rating:</strong> ${r.rating}/5</p>
      `;
      searchResults.appendChild(div);
    }, index * 100);
  });

  // Map
  setTimeout(() => {
    if (map) map.remove();
    map = L.map("map").setView(list[0].location, 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
    }).addTo(map);

    list.forEach((r) => {
      L.marker(r.location)
        .addTo(map)
        .bindPopup(`<b>${r.name}</b><br>${r.address}<br>${r.food}<br>⭐ ${r.rating}`);
    });
  }, 600);
}

// ===================== STAR FUNCTION =====================
function getStarHTML(rating) {
  const stars = Math.round(rating);
  let html = "";
  for (let i = 0; i < stars; i++) html += `<span class="star-bubble">⭐</span>`;
  return html;
}
