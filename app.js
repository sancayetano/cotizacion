class CotizacionesApp {
    constructor() {
        this.isUpdating = false;
        this.firstUpdate = true;
        
        // Valores iniciales
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
        // Actualizar automáticamente cada 30 segundos (para pruebas)
        setInterval(() => this.simularActualizacion(), 30000);
    }

    setupEventListeners() {
        const updateBtn = document.getElementById('updateBtn');
        if (updateBtn) {
            updateBtn.addEventListener('click', () => {
                if (!this.isUpdating) this.manualUpdate();
            });
        }
    }

    async manualUpdate() {
        if (this.isUpdating) return;
        
        this.isUpdating = true;
        this.showUpdatingState();
        
        try {
            // Simular delay de red
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // Generar nuevos valores aleatorios
            this.simularActualizacion();
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

    simularActualizacion() {
        const oldValues = JSON.parse(JSON.stringify(this.cotizaciones));
        
        // Variar los valores ligeramente (± 10 para dólar, ± 5 para real)
        this.cotizaciones.dolar.compra += Math.floor(Math.random() * 21) - 10;
        this.cotizaciones.dolar.venta += Math.floor(Math.random() * 21) - 10;
        this.cotizaciones.real.compra += Math.floor(Math.random() * 11) - 5;
        this.cotizaciones.real.venta += Math.floor(Math.random() * 11) - 5;
        
        // Recalcular Real-Dólar
        this.cotizaciones.realDolar.compra = this.cotizaciones.dolar.compra / this.cotizaciones.real.compra;
        this.cotizaciones.realDolar.venta = this.cotizaciones.dolar.venta / this.cotizaciones.real.venta;
        this.cotizaciones.realDolar.compra = Math.round(this.cotizaciones.realDolar.compra * 10000) / 10000;
        this.cotizaciones.realDolar.venta = Math.round(this.cotizaciones.realDolar.venta * 10000) / 10000;
        
        // Asegurar que compra < venta
        if (this.cotizaciones.dolar.compra >= this.cotizaciones.dolar.venta) {
            this.cotizaciones.dolar.venta = this.cotizaciones.dolar.compra + 20;
        }
        if (this.cotizaciones.real.compra >= this.cotizaciones.real.venta) {
            this.cotizaciones.real.venta = this.cotizaciones.real.compra + 10;
        }
        if (this.cotizaciones.realDolar.compra >= this.cotizaciones.realDolar.venta) {
            this.cotizaciones.realDolar.venta = this.cotizaciones.realDolar.compra + 0.05;
        }
        
        if (this.hayCambios(oldValues)) {
            this.updateDisplay();
        }
    }

    // Los métodos showUpdatingState, showSuccessState, etc. son IGUALES
    // Copia los mismos métodos de la versión anterior desde showUpdatingState() hasta formatNumber()
    
    // ... [PEGA AQUÍ TODOS LOS MÉTODOS RESTANTES DE LA VERSIÓN ANTERIOR]
    // showUpdatingState(), showSuccessState(), showErrorState(), resetButtonState(),
    // updateValueWithArrow(), saveCurrentAsPrevious(), formatNumber(), etc.
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    window.app = new CotizacionesApp();
});
