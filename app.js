class CotizacionesApp {
    constructor() {
        this.sourceUrl = 'https://www.nortecambios.com.py/';
        this.autoUpdateInterval = 300000;
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
        }, 3000);
        
        setInterval(() => {
            this.fetchCotizaciones(false);
        }, this.autoUpdateInterval);
    }

    async manualUpdate() {
        if (this.isUpdating) return;
        
        this.isUpdating = true;
        this.showUpdatingState();
        
        try {
            await this.fetchCotizaciones(true);
            this.showSuccessState();
        } catch (error) {
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
            // Usar proxy para evitar CORS
            const proxyUrl = 'https://api.allorigins.win/raw?url=';
            const targetUrl = encodeURIComponent(this.sourceUrl);
            
            const response = await fetch(`${proxyUrl}${targetUrl}`, {
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            if (!response.ok) throw new Error(`Error: ${response.status}`);
            
            const html = await response.text();
            await this.parseCotizaciones(html);
            
        } catch (error) {
            if (showFeedback) throw error;
        }
    }

    async parseCotizaciones(html) {
        const oldValues = JSON.parse(JSON.stringify(this.cotizaciones));
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const pageText = doc.body.textContent || '';
        
        // Buscar dólar con patrones más flexibles
        this.buscarDolar(pageText);
        
        // Buscar real
        this.buscarReal(pageText);
        
        // Calcular Real-Dólar si no se encuentra
        this.calcularRealDolar();
        
        // Actualizar si hay cambios
        if (this.hayCambios(oldValues)) {
            this.updateDisplay();
        }
    }

    buscarDolar(texto) {
        const patrones = [
            /dólar.*?(\d[\d.,]+)\D+(\d[\d.,]+)/i,
            /dolar.*?(\d[\d.,]+)\D+(\d[\d.,]+)/i,
            /usd.*?(\d[\d.,]+)\D+(\d[\d.,]+)/i,
            /compra.*?dólar.*?(\d[\d.,]+)/i,
            /venta.*?dólar.*?(\d[\d.,]+)/i
        ];
        
        for (const patron of patrones) {
            const match = patron.exec(texto);
            if (match) {
                if (match[1] && match[2]) {
                    // Tiene compra y venta juntos
                    this.cotizaciones.dolar.compra = this.parseNumber(match[1]);
                    this.cotizaciones.dolar.venta = this.parseNumber(match[2]);
                    return;
                } else if (match[1]) {
                    // Solo un valor
                    const valor = this.parseNumber(match[1]);
                    if (valor > this.cotizaciones.dolar.compra) {
                        this.cotizaciones.dolar.venta = valor;
                    } else {
                        this.cotizaciones.dolar.compra = valor;
                    }
                }
            }
        }
    }

    buscarReal(texto) {
        const patrones = [
            /real.*?(\d[\d.,]+)\D+(\d[\d.,]+)/i,
            /brl.*?(\d[\d.,]+)\D+(\d[\d.,]+)/i,
            /r\$.?(\d[\d.,]+)\D+(\d[\d.,]+)/i
        ];
        
        for (const patron of patrones) {
            const match = patron.exec(texto);
            if (match && match[1] && match[2]) {
                this.cotizaciones.real.compra = this.parseNumber(match[1]);
                this.cotizaciones.real.venta = this.parseNumber(match[2]);
                return;
            }
        }
    }

    calcularRealDolar() {
        if (this.cotizaciones.dolar.compra > 0 && this.cotizaciones.real.compra > 0) {
            this.cotizaciones.realDolar.compra = this.cotizaciones.dolar.compra / this.cotizaciones.real.compra;
            this.cotizaciones.realDolar.venta = this.cotizaciones.dolar.venta / this.cotizaciones.real.venta;
            
            this.cotizaciones.realDolar.compra = Math.round(this.cotizaciones.realDolar.compra * 10000) / 10000;
            this.cotizaciones.realDolar.venta = Math.round(this.cotizaciones.realDolar.venta * 10000) / 10000;
        }
    }

    parseNumber(text) {
        if (!text) return 0;
        
        const cleaned = String(text)
            .replace(/[^\d,.-]/g, '')
            .replace(/\.(?=\d{3})/g, '')
            .replace(',', '.');
            
        const number = parseFloat(cleaned);
        return isNaN(number) ? 0 : Math.round(number * 100) / 100;
    }

    hayCambios(oldValues) {
        return (
            oldValues.dolar.compra !== this.cotizaciones.dolar.compra ||
            oldValues.dolar.venta !== this.cotizaciones.dolar.venta ||
            oldValues.real.compra !== this.cotizaciones.real.compra ||
            oldValues.real.venta !== this.cotizaciones.real.venta ||
            oldValues.realDolar.compra !== this.cotizaciones.realDolar.compra ||
            oldValues.realDolar.venta !== this.cotizaciones.realDolar.venta
        );
    }

    updateDisplay() {
        this.updateValueWithArrow('dolarCompra', this.cotizaciones.dolar.compra, 'dolar', 'compra');
        this.updateValueWithArrow('dolarVenta', this.cotizaciones.dolar.venta, 'dolar', 'venta');
        this.updateValueWithArrow('realCompra', this.cotizaciones.real.compra, 'real', 'compra');
        this.updateValueWithArrow('realVenta', this.cotizaciones.real.venta, 'real', 'venta');
        this.updateValueWithArrow('realDolarCompra', this.cotizaciones.realDolar.compra, 'realDolar', 'compra', 4);
        this.updateValueWithArrow('realDolarVenta', this.cotizaciones.realDolar.venta, 'realDolar', 'venta', 4);
        
        if (!this.firstUpdate) {
            this.saveCurrentAsPrevious();
        }
        this.firstUpdate = false;
    }

    updateValueWithArrow(elementId, value, currency, type, decimals = 2) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const formattedValue = this.formatNumber(value, decimals);
        
        // Asegurar contenedor con flecha
        let container = element.parentElement;
        if (!container.classList.contains('valor-container')) {
            const newContainer = document.createElement('div');
            newContainer.className = 'valor-container';
            element.parentElement.replaceChild(newContainer, element);
            newContainer.appendChild(element);
            
            const arrowSpan = document.createElement('span');
            arrowSpan.className = 'price-change hidden';
            arrowSpan.innerHTML = '<i class="fas fa-arrow-up"></i>';
            newContainer.appendChild(arrowSpan);
            
            container = newContainer;
        }
        
        // Manejar flecha
        const arrow = container.querySelector('.price-change');
        
        if (!this.firstUpdate && this.previousValues[currency][type] !== 0) {
            const previous = this.previousValues[currency][type];
            const current = value;
            
            if (current > previous) {
                arrow.className = 'price-change up';
                arrow.innerHTML = '<i class="fas fa-arrow-up"></i>';
                arrow.classList.remove('hidden');
            } else if (current < previous) {
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
        
        // Actualizar valor
        if (element.textContent !== formattedValue) {
            element.textContent = formattedValue;
            element.classList.add('updated');
            setTimeout(() => element.classList.remove('updated'), 1000);
        }
    }

    saveCurrentAsPrevious() {
        this.previousValues.dolar.compra = this.cotizaciones.dolar.compra;
        this.previousValues.dolar.venta = this.cotizaciones.dolar.venta;
        this.previousValues.real.compra = this.cotizaciones.real.compra;
        this.previousValues.real.venta = this.cotizaciones.real.venta;
        this.previousValues.realDolar.compra = this.cotizaciones.realDolar.compra;
        this.previousValues.realDolar.venta = this.cotizaciones.realDolar.venta;
    }

    formatNumber(num, decimals = 2) {
        if (num === 0 || isNaN(num)) {
            return decimals === 4 ? '--,----' : '--.--';
        }
        
        return num.toLocaleString('es-PY', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    window.app = new CotizacionesApp();
});
