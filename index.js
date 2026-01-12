// WanderWise - Interactive Tourist Destination Map
// ==================================================

document.addEventListener('DOMContentLoaded', () => {
	// ===== THEME & UI SETUP =====
	const themeToggle = document.getElementById('theme-toggle');
	const isDarkMode = localStorage.getItem('theme') === 'dark';
	if (isDarkMode) {
		document.body.classList.add('dark-mode');
		themeToggle.textContent = '☀️';
	}
	themeToggle.addEventListener('click', () => {
		document.body.classList.toggle('dark-mode');
		const isDark = document.body.classList.contains('dark-mode');
		localStorage.setItem('theme', isDark ? 'dark' : 'light');
		themeToggle.textContent = isDark ? '☀️' : '🌙';
	});

	// ===== HAMBURGER MENU =====
	const hamburger = document.getElementById('hamburger-btn');
	const sidebar = document.getElementById('sidebar');
	const sidebarClose = document.getElementById('sidebar-close');
	const closeSidebarOnMobile = () => {
		if (window.innerWidth <= 768) {
			hamburger.classList.remove('active');
			sidebar.classList.remove('open');
		}
	};
	
	hamburger.addEventListener('click', () => {
		hamburger.classList.toggle('active');
		sidebar.classList.toggle('open');
	});
	sidebarClose.addEventListener('click', closeSidebarOnMobile);

	// ===== MAP INITIALIZATION =====
	const mapEl = document.getElementById('map');
	if (!mapEl) return;

	const baguioCenter = [16.41106, 120.59332];
	const map = L.map('map', { center: baguioCenter, zoom: 13 });
	const southWest = L.latLng(16.33, 120.52);
	const northEast = L.latLng(16.48, 120.66);
	const baguioBounds = L.latLngBounds(southWest, northEast);
	map.setMaxBounds(baguioBounds);
	map.on('drag', () => map.panInsideBounds(baguioBounds, { animate: false }));

	// ===== TILE LAYERS =====
	const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
		maxZoom: 19,
		attribution: 'Tiles &copy; Esri'
	});
	const streets = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		maxZoom: 19,
		attribution: '&copy; OpenStreetMap contributors'
	});
	satellite.addTo(map);
	const baseLayers = { 'Satellite': satellite, 'Streets': streets };

	// ===== STATE & DATA =====
	const destinations = [
		{ id: 'burnham', name: 'Burnham Park', coords: [16.4142, 120.5970], desc: 'Iconic lagoon and park in the city center.', crowd: 'High (~2,000/day)', visitors: { monthly: [1500,1600,1700,1800,2200,2500,2600,2400,2000,1800,1700,1600], daily: [1200,1250,1300,1400,1600,1700,1800,1750,1600,1500,1450,1400,1350,1300,1280,1270,1250,1240,1230,1220,1210,1205,1200,1190,1180,1170,1160,1150,1140,1130], hourly: [50,40,30,25,20,30,50,120,200,300,250,180,160,140,120,100,90,80,70,60,55,50,45,40] } },
		{ id: 'minesview', name: 'Mines View Park', coords: [16.4216, 120.6003], desc: 'Scenic viewpoint of mining areas and mountains.', crowd: 'High (~1,500/day)', visitors: { monthly: [900,950,1000,1100,1400,1600,1700,1500,1300,1100,1000,950], daily: [700,720,740,760,900,1000,1100,1200,1150,1100,1050,1000,980,960,940,920,900,880,860,840,820,800,780,760,740,720,700,680,660,640], hourly: [20,18,15,12,10,20,40,80,150,220,200,150,140,130,120,110,100,90,80,70,60,50,40,30] } },
		{ id: 'wright', name: 'Wright Park', coords: [16.4118, 120.5974], desc: 'Horse riding and pine-tree park.', crowd: 'Moderate (~800/day)', visitors: { monthly: [400,420,450,480,700,850,900,820,750,600,500,450], daily: [300,320,340,360,500,600,700,750,720,680,640,600,580,560,540,520,500,480,460,440,420,400,380,360,340,320,300,280,260,240], hourly: [5,5,5,5,10,20,40,80,120,140,130,110,100,90,80,70,60,50,40,30,20,15,10,8] } },
		{ id: 'botanical', name: 'Botanical Garden', coords: [16.4059, 120.5980], desc: 'Collection of plants and cultural cottages.', crowd: 'Low (~400/day)', visitors: { monthly: [200,220,240,260,320,400,420,410,380,320,260,230], daily: [150,160,170,180,220,260,300,330,320,300,280,260,250,240,230,220,210,200,190,180,170,160,150,145,140,135,130,125,120,115], hourly: [2,2,2,2,5,10,20,40,60,80,70,60,55,50,45,40,35,30,25,20,15,10,6,4] } },
		{ id: 'johnhay', name: 'Camp John Hay', coords: [16.4102, 120.5916], desc: 'Historic campsite with gardens and trails.', crowd: 'Moderate (~900/day)', visitors: { monthly: [500,550,600,650,900,1000,1050,980,900,750,650,600], daily: [400,420,440,460,600,700,800,850,820,780,740,700,680,660,640,620,600,580,560,540,520,500,480,460,440,420,400,380,360,340], hourly: [10,10,10,10,20,40,80,140,200,220,210,180,160,150,140,130,120,110,100,90,80,70,40,20] } }
	];

	const destLayer = L.layerGroup();
	const markers = {};
	let currentMode = 'time';
	let currentSelectedDest = null;
	let comments = JSON.parse(localStorage.getItem('wanderwiseComments') || '{}');

	// ===== UTILITY FUNCTIONS =====
	const percentToClass = p => p >= 30 ? 'very-high' : p >= 20 ? 'high' : p >= 10 ? 'moderate' : 'low';
	const createDivIcon = percent => {
		const pct = Math.round(percent);
		const cls = percentToClass(pct);
		const html = `<div class="pct-marker ${cls}"><span>${pct}%</span></div>`;
		return L.divIcon({ className: 'custom-div-icon', html, iconSize: [40, 40], iconAnchor: [20, 20] });
	};

	const computePercentFor = (dest, mode) => {
		const key = mode === 'time' ? 'hourly' : mode === 'day' ? 'daily' : 'monthly';
		const destTotal = dest.visitors[key].reduce((a, b) => a + b, 0);
		const grandTotal = destinations.reduce((sum, d) => sum + d.visitors[key].reduce((a, b) => a + b, 0), 0);
		return grandTotal > 0 ? (destTotal / grandTotal) * 100 : 0;
	};

	const formatLastNDays = n => {
		const res = [];
		const now = new Date();
		for (let i = n - 1; i >= 0; i--) {
			const d = new Date(now);
			d.setDate(now.getDate() - i);
			res.push((d.getMonth() + 1) + '/' + d.getDate());
		}
		return res;
	};

	// ===== CHART SETUP =====
	const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
	const hours = Array.from({ length: 24 }, (_, i) => (i).toString().padStart(2, '0') + ':00');
	const chartCanvas = document.getElementById('destChart');
	let destChart = null;

	if (chartCanvas && typeof Chart !== 'undefined') {
		const ctx = chartCanvas.getContext('2d');
		destChart = new Chart(ctx, {
			type: 'line',
			data: {
				labels: hours,
				datasets: [{ label: 'Visitors', data: Array(24).fill(0), borderColor: 'rgb(75,192,192)', backgroundColor: 'rgba(75,192,192,0.1)', tension: 0.2 }]
			},
			options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
		});
	}

	const updateChartFor = (dest, mode) => {
		if (!destChart || !dest) return;
		const key = mode === 'time' ? 'hourly' : mode === 'day' ? 'daily' : 'monthly';
		const labels = mode === 'time' ? hours : mode === 'day' ? formatLastNDays(30) : months;
		const labels_text = mode === 'time' ? 'Hourly' : mode === 'day' ? 'Daily (last 30 days)' : 'Monthly';
		destChart.data.labels = labels;
		destChart.data.datasets[0].data = dest.visitors[key].slice();
		destChart.data.datasets[0].label = `${labels_text} Visitors`;
		destChart.update();
	};

	// ===== MARKERS & UI =====
	const style = document.createElement('style');
	style.textContent = `.custom-div-icon{background:transparent}.pct-marker{width:40px;height:40px;border-radius:20px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:12px}.pct-marker.low{background:#2ecc71}.pct-marker.moderate{background:#f1c40f}.pct-marker.high{background:#e67e22}.pct-marker.very-high{background:#e74c3c}`;
	document.head.appendChild(style);

	destinations.forEach(d => {
		const marker = L.marker(d.coords, { icon: createDivIcon(0) }).bindPopup(`<b>${d.name}</b><br>${d.desc}<br><i id="popup-percent-${d.id}">Percent: N/A</i>`);
		marker.addTo(destLayer);
		markers[d.id] = marker;
	});
	destLayer.addTo(map);

	const updateMarkers = mode => {
		destinations.forEach(d => {
			const pct = computePercentFor(d, mode);
			markers[d.id].setIcon(createDivIcon(pct));
		});
	};
	updateMarkers(currentMode);

	// ===== SIDEBAR & DESTINATION CARDS =====
	const listEl = document.getElementById('dest-list');
	const detailPopup = document.getElementById('detail-popup');
	const detailContent = document.getElementById('detail-content');
	const detailClose = document.getElementById('detail-close');

	destinations.forEach(d => {
		const card = document.createElement('div');
		card.className = 'card dest-card';
		card.innerHTML = `<h3>${d.name}</h3><p>${d.desc}</p><p><strong>Crowd:</strong> ${d.crowd}</p>`;
		listEl.appendChild(card);
	});

	const displayComments = destId => {
		const commentsList = document.getElementById('comments-list');
		const destComments = comments[destId] || [];
		commentsList.innerHTML = destComments.map(c => `<div class="comment-item"><div class="comment-name">${c.name}</div><div class="comment-text">${c.text}</div><div class="comment-time">${c.time}</div></div>`).join('');
	};

	const recTexts = {
		'very-high': 'Very crowded — consider visiting early morning or another site.',
		'high': 'Crowded — expect waits; visit off-peak if possible.',
		'moderate': 'Moderate crowd — comfortable for most visitors.',
		'low': 'Low crowd — pleasant and recommended.'
	};

	const handleDestinationClick = (d, card) => {
		currentSelectedDest = d;
		map.setView(d.coords, 15);
		markers[d.id].openPopup();
		document.querySelectorAll('.dest-card').forEach(c => c.classList.remove('active'));
		card.classList.add('active');
		closeSidebarOnMobile();

		const pct = Math.round(computePercentFor(d, currentMode));
		const cls = percentToClass(pct);

		document.getElementById('chart-title').textContent = d.name;
		const strainEl = document.getElementById('strain-text');
		strainEl.textContent = `Strain: ${pct}% (${d.crowd})`;
		strainEl.style.padding = '6px 8px';
		strainEl.style.borderRadius = '4px';
		strainEl.style.color = 'white';
		strainEl.style.background = cls === 'very-high' ? '#e74c3c' : cls === 'high' ? '#e67e22' : cls === 'moderate' ? '#f1c40f' : '#2ecc71';

		updateChartFor(d, currentMode);
		displayComments(d.id);

		detailContent.innerHTML = `<h4>${d.name}</h4><p>${d.desc}</p><p><strong>Percent of visitors:</strong> ${pct}%</p><div class="recommend ${cls}">${recTexts[cls]}</div>`;
		detailPopup.classList.add('visible');
		detailPopup.setAttribute('aria-hidden', 'false');
	};

	listEl.querySelectorAll('.dest-card').forEach((card, idx) => {
		card.addEventListener('click', () => handleDestinationClick(destinations[idx], card));
	});

	if (detailClose) {
		detailClose.addEventListener('click', () => {
			detailPopup.classList.remove('visible');
			detailPopup.setAttribute('aria-hidden', 'true');
		});
	}

	// ===== COMMENTS =====
	const commentForm = document.getElementById('comment-form');
	if (commentForm) {
		commentForm.addEventListener('submit', (e) => {
			e.preventDefault();
			if (!currentSelectedDest) return;
			
			const name = document.getElementById('comment-name').value.trim();
			const text = document.getElementById('comment-text').value.trim();
			if (!name || !text) return;

			if (!comments[currentSelectedDest.id]) comments[currentSelectedDest.id] = [];
			comments[currentSelectedDest.id].push({ name, text, time: new Date().toLocaleString() });
			localStorage.setItem('wanderwiseComments', JSON.stringify(comments));
			
			displayComments(currentSelectedDest.id);
			commentForm.reset();
		});
	}

	// ===== CHART MODE BUTTONS =====
	const modeTimeBtn = document.getElementById('mode-time');
	const modeDayBtn = document.getElementById('mode-day');
	const modeMonthBtn = document.getElementById('mode-month');

	const setMode = mode => {
		currentMode = mode;
		document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
		if (mode === 'time') modeTimeBtn.classList.add('active');
		else if (mode === 'day') modeDayBtn.classList.add('active');
		else modeMonthBtn.classList.add('active');
		
		updateMarkers(mode);
		
		if (currentSelectedDest) {
			const pct = Math.round(computePercentFor(currentSelectedDest, mode));
			document.getElementById('strain-text').textContent = `Strain: ${pct}% (${currentSelectedDest.crowd})`;
			updateChartFor(currentSelectedDest, mode);
		}
	};

	modeTimeBtn.addEventListener('click', () => setMode('time'));
	modeDayBtn.addEventListener('click', () => setMode('day'));
	modeMonthBtn.addEventListener('click', () => setMode('month'));

	// ===== LAYER CONTROL =====
	L.control.layers(baseLayers, { 'Tourist Destinations': destLayer }, { collapsed: false }).addTo(map);
});

