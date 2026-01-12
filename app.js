class CotizacionesApp {
    constructor() {
        this.sourceUrl = 'https://www.nortecambios.com.py/';
        this.autoUpdateInterval = 300000; // 5 minutos
        this.isUpdating = false;
        this.firstUpdate = true;
        
        this.cotizaciones = {
            dolar: { compra: 6480, venta: 6680 },
            real: { compra: 1175, venta: 1230 },
            realDolar: { compra: 5.42, venta: 5.50 }
        };
        
        this.previousValues = {
            dolar: { compra: 0, venta: 0 },
            real: { compra: 0, venta: 0 },
            realDolar: { compra: 0, venta: 0 }
        };
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.startAutoUpdate();
    }

    setupEventListeners() {
        const updateBtn = document.getElementById('updateBtn');
        if (updateBtn) {
            updateBtn.addEventListener('click', () => {
                if (!this.isUpdating) this.manualUpdate();
            });
        }
    }

    startAutoUpdate() {
        setTimeout(() => {
            this.fetchCotizaciones(false);
            setInterval(() => this.fetchCotizaciones(false), this.autoUpdateInterval);
        }, 3000);
    }

    async manualUpdate() {
        if (this.isUpdating) return;
        this.isUpdating = true;
        this.showUpdatingState();
        
        try {
            await this.fetchCotizaciones(true);
            this.showSuccessState();
        } catch (error) {
            console.error('Error:', error);
            this.showErrorState();
        } finally {
            setTimeout(() => {
                this.resetButtonState();
                this.isUpdating = false;
            }, 1500);
        }
    }

    showUpdatingState() {
        const btn = document.getElementById('updateBtn');
        if (!btn) return;
        btn.classList.add('updating');
        btn.innerHTML = '<i class="fas fa-spinner"></i> Actualizando...';
    }

    showSuccessState() {
        const btn = document.getElementById('updateBtn');
        if (!btn) return;
        btn.classList.remove('updating');
        btn.classList.add('success');
        btn.innerHTML = '<i class="fas fa-check"></i> ¡Actualizado!';
        
        document.querySelectorAll('.valor').forEach(el => {
            el.classList.add('updated');
            setTimeout(() => el.classList.remove('updated'), 1000);
        });
    }

    showErrorState() {
        const btn = document.getElementById('updateBtn');
        if (!btn) return;
        btn.classList.remove('updating');
        btn.classList.add('error');
        btn.innerHTML = '<i class="fas fa-times"></i> Error';
    }

    resetButtonState() {
        const btn = document.getElementById('updateBtn');
        if (!btn) return;
        btn.classList.remove('updating', 'success', 'error');
        btn.innerHTML = '<i class="fas fa-sync-alt"></i> Actualizar Cotizaciones';
    }

    async fetchCotizaciones(showFeedback = false) {
        try {
            const proxyUrl = 'https://api.allorigins.win/raw?url=';
            const targetUrl = encodeURIComponent(this.sourceUrl);
            
            const response = await fetch(`${proxyUrl}${targetUrl}`, {
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            
            if (!response.ok) throw new Error(`Error: ${response.status}`);
            
            const html = await response.text();
            await this.parseCotizaciones(html);
            
        } catch (error) {
            console.error('Error al obtener:', error);
            if (showFeedback) throw error;
        }
    }

    async parseCotizaciones(html) {
        const oldValues = { ...this.cotizaciones };
        const pageText = html.toLowerCase();
        
        // Buscar dólar
        const dolarMatch = /dólar.*?(\d[\d.,]+).*?(\d[\d.,]+)/.exec(pageText);
        if (dolarMatch) {
            this.cotizaciones.dolar.compra = this.parseNumber(dolarMatch[1]);
            this.cotizaciones.dolar.venta = this.parseNumber(dolarMatch[2]);
        }
        
        // Buscar real
        const realMatch = /real.*?(\d[\d.,]+).*?(\d[\d.,]+)/.exec(pageText);
        if (realMatch) {
            this.cotizaciones.real.compra = this.parseNumber(realMatch[1]);
            this.cotizaciones.real.venta = this.parseNumber(realMatch[2]);
        }
        
        // Calcular real-dólar
        if (this.cotizaciones.dolar.compra > 0 && this.cotizaciones.real.compra > 0) {
            this.cotizaciones.realDolar.compra = this.cotizaciones.dolar.compra / this.cotizaciones.real.compra;
            this.cotizaciones.realDolar.venta = this.cotizaciones.dolar.venta / this.cotizaciones.real.venta;
            this.cotizaciones.realDolar.compra = Math.round(this.cotizaciones.realDolar.compra * 10000) / 10000;
            this.cotizaciones.realDolar.venta = Math.round(this.cotizaciones.realDolar.venta * 10000) / 10000;
        }
        
        if (this.hayCambios(oldValues)) this.updateDisplay();
    }

    parseNumber(text) {
        if (!text) return 0;
        const cleaned = text.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3})/g, '').replace(',', '.');
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : Math.round(num * 100) / 100;
    }

    hayCambios(oldValues) {
        return Object.keys(oldValues).some(moneda => 
            oldValues[moneda].compra !== this.cotizaciones[moneda].compra ||
            oldValues[moneda].venta !== this.cotizaciones[moneda].venta
        );
    }

    updateDisplay() {
        this.updateValueWithArrow('dolarCompra', this.cotizaciones.dolar.compra, 'dolar', 'compra');
        this.updateValueWithArrow('dolarVenta', this.cotizaciones.dolar.venta, 'dolar', 'venta');
        this.updateValueWithArrow('realCompra', this.cotizaciones.real.compra, 'real', 'compra');
        this.updateValueWithArrow('realVenta', this.cotizaciones.real.venta, 'real', 'venta');
        this.updateValueWithArrow('realDolarCompra', this.cotizaciones.realDolar.compra, 'realDolar', 'compra', 4);
        this.updateValueWithArrow('realDolarVenta', this.cotizaciones.realDolar.venta, 'realDolar', 'venta', 4);
        
        if (!this.firstUpdate) this.saveCurrentAsPrevious();
        this.firstUpdate = false;
    }

    updateValueWithArrow(elementId, value, currency, type, decimals = 2) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const formattedValue = this.formatNumber(value, decimals);
        let container = element.parentElement;
        
        if (!container.classList.contains('valor-container')) {
            const newContainer = document.createElement('div');
            newContainer.className = 'valor-container';
            element.parentElement.replaceChild(newContainer, element);
            newContainer.appendChild(element);
            
            const arrow = document.createElement('span');
            arrow.className = 'price-change hidden';
            arrow.innerHTML = '<i class="fas fa-arrow-up"></i>';
            newContainer.appendChild(arrow);
            container = newContainer;
        }
        
        const arrow = container.querySelector('.price-change');
        
        if (!this.firstUpdate && this.previousValues[currency][type] !== 0) {
            const prev = this.previousValues[currency][type];
            if (value > prev) {
                arrow.className = 'price-change up';
                arrow.innerHTML = '<i class="fas fa-arrow-up"></i>';
                arrow.classList.remove('hidden');
            } else if (value < prev) {
                arrow.className = 'price-change down';
                arrow.innerHTML = '<i class="fas fa-arrow-down"></i>';
                arrow.classList.remove('hidden');
            } else {
                arrow.classList.add('hidden');
            }
            
            setTimeout(() => arrow.classList.add('hidden'), 5000);
        } else {
            arrow.classList.add('hidden');
        }
        
        if (element.textContent !== formattedValue) {
            element.textContent = formattedValue;
            element.classList.add('updated');
            setTimeout(() => element.classList.remove('updated'), 1000);
        }
    }

    saveCurrentAsPrevious() {
        Object.keys(this.cotizaciones).forEach(moneda => {
            this.previousValues[moneda].compra = this.cotizaciones[moneda].compra;
            this.previousValues[moneda].venta = this.cotizaciones[moneda].venta;
        });
    }

    formatNumber(num, decimals = 2) {
        if (num === 0 || isNaN(num)) return decimals === 4 ? '--,----' : '--.--';
        return num.toLocaleString('es-PY', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }
}

// Inicializar
window.addEventListener('DOMContentLoaded', () => {
    window.app = new CotizacionesApp();
});