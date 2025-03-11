/**
 * @see https://cdn.jsdelivr.net/gh/hi2ma-bu4/jasc@v1.15.3.9/jasc.js
 * @typedef {import('./jasc').Jasc} Jasc
 * @typedef {import('./jasc').jasc} jasc
 */

jasc.on(
	"DOMContentLoaded",
	() => {
		const canvas = document.createElement("canvas");
		document.body.appendChild(canvas);

		const mandelbrot = new Mandelbrot(canvas);

		const _r_min = -2;
		const _r_max = 1;
		const _i_min = -1.3;
		const _i_max = 1.3;
		const _num_i = 500;
		const _color_map = 0;
		let r_min = _r_min;
		let r_max = _r_max;
		let i_min = _i_min;
		let i_max = _i_max;
		let num_i = _num_i;
		let color_map = _color_map;

		mandelbrot.init().then(() => {
			mandelbrot.draw(r_min, r_max, i_min, i_max, num_i, color_map);
		});

		jasc.on("keyChange", (e) => {
			for (const key of e.add) {
				let r, rRange, i, iRange;
				switch (key) {
					case "Semicolon":
						// +
						r = (r_min + r_max) / 2;
						rRange = (r_max - r_min) / 4;
						r_min = r - rRange;
						r_max = r + rRange;
						i = (i_min + i_max) / 2;
						iRange = (i_max - i_min) / 4;
						i_min = i - iRange;
						i_max = i + iRange;
						num_i += 150;
						break;
					case "Minus":
						// -
						r = (r_min + r_max) / 2;
						rRange = r_max - r_min;
						r_min = r - rRange;
						r_max = r + rRange;
						i = (i_min + i_max) / 2;
						iRange = i_max - i_min;
						i_min = i - iRange;
						i_max = i + iRange;
						num_i -= 150;
						break;
					case "ArrowUp":
						i = (i_max - i_min) / 10;
						i_min += i;
						i_max += i;
						break;
					case "ArrowDown":
						i = (i_max - i_min) / 10;
						i_min -= i;
						i_max -= i;
						break;
					case "ArrowLeft":
						r = (r_max - r_min) / 10;
						r_min -= r;
						r_max -= r;
						break;
					case "ArrowRight":
						r = (r_max - r_min) / 10;
						r_min += r;
						r_max += r;
						break;
					case "KeyR":
						r_min = _r_min;
						r_max = _r_max;
						i_min = _i_min;
						i_max = _i_max;
						num_i = _num_i;
						color_map = _color_map;
						break;
					case "Digit1":
						color_map = 0;
						break;
					case "Digit2":
						color_map = 1;
						break;
					case "Digit3":
						color_map = 2;
						break;
					default:
						continue;
				}
				mandelbrot.draw(r_min, r_max, i_min, i_max, num_i, color_map);
				break;
			}
		});
	},
	null,
	{ runAnimationFrame: true }
);

document.addEventListener(
	"touchmove",
	function (event) {
		if (event.scale !== 1) {
			event.preventDefault();
		}
	},
	{ passive: false }
);

document.addEventListener(
	"wheel",
	(evt) => {
		const isPinch = !!(evt.deltaY % 1);

		if (isPinch) evt.preventDefault();
	},
	{
		passive: false,
	}
);

class Mandelbrot {
	/** @type {number} */
	resizeWait = 1000;
	/** @type {number} */
	_nowResize = 0;

	constructor(canvas) {
		/** @type {HTMLCanvasElement} */
		this.canvas = canvas;
		/** @type {WebGLWrapper} */
		this.glw = new WebGLWrapper(canvas, { preserveDrawingBuffer: true });

		// サイズリセット
		jasc.on("windowResize", this._resize.bind(this));
		this._resize();
	}

	init() {
		return new Promise((resolve) => {
			// シェーダー初期化
			this.initBuffer();
			this.initShader().then(() => {
				this.afterInit();
				resolve();
			});
		});
	}

	/**
	 * シェーダーの読み込み
	 * @returns {undefined}
	 */
	async initShader() {
		let urls = ["./vertex_shader.glsl", "./fragment_shader2.glsl"];
		if (!this.glw.isWebGL2) {
			urls[1] = "./fragment_shader1.glsl";
		}

		// GLSL の読み込み
		const sData = await Promise.all(urls.map((url) => this._getFileText(url)));

		/** @type {WebGLProgram} */
		this.program = this.glw.createProgram(...sData);
	}

	/**
	 * 頂点配列オブジェクト (VAO) を作成する
	 * @returns {undefined}
	 */
	initBuffer() {
		const gl = this.glw.gl;
		gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0]), gl.STATIC_DRAW);
	}

	afterInit() {
		const gl = this.glw.gl;
		const program = this.program;
		this.minLocation = gl.getUniformLocation(program, "min");
		this.maxLocation = gl.getUniformLocation(program, "max");
		this.resolutionLocation = gl.getUniformLocation(program, "resolution");
		this.iterationLocation = gl.getUniformLocation(program, "iterations");
		this.colorMapIndexLocation = gl.getUniformLocation(program, "colorMapIndex");
	}

	draw(r_min, r_max, i_min, i_max, num_i, color_map) {
		if (num_i < 100) num_i = 100;
		this._cache = [r_min, r_max, i_min, i_max, num_i, color_map];
		const gl = this.glw.gl;
		gl.viewport(0, 0, this.width, this.height);

		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		gl.useProgram(this.program);

		gl.uniform2f(this.minLocation, r_min, i_min);
		gl.uniform2f(this.maxLocation, r_max, i_max);
		gl.uniform2f(this.resolutionLocation, this.width, this.height);
		gl.uniform1i(this.iterationLocation, num_i);
		gl.uniform1i(this.colorMapIndexLocation, color_map);

		gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

		gl.enableVertexAttribArray(0);
		gl.drawArrays(gl.TRIANGLES, 0, 6);
		gl.disableVertexAttribArray(0);
	}

	/**
	 * ファイルの読み込み
	 * @param {string} url
	 * @returns {Promise<string>}
	 */
	_getFileText(url) {
		return new Promise((resolve, reject) => {
			jasc.ajax({
				url,
				timeout: 1000 * 10,
				success: resolve,
				error: reject,
			});
		});
	}

	/**
	 * canvasサイズをリセット
	 * @returns {undefined}
	 */
	_resize() {
		if (this._nowResize) {
			this._nowResize = 2;
			return;
		}
		this._nowResize = 1;

		const canvas = this.canvas;
		this.width = canvas.width = document.body.clientWidth;
		this.height = canvas.height = document.body.clientHeight;

		const this_ = this;
		setTimeout(() => {
			const nr = this_._nowResize;
			this_._nowResize = 0;
			this.draw(...this_._cache);
			if (nr == 2) {
				this._resize();
			}
		}, this.resizeWait);
	}
}

class WebGLWrapper {
	/**
	 * WebGLWrapper のコンストラクタ
	 * @param {HTMLCanvasElement} canvas - 描画対象のキャンバス要素
	 * @param {WebGLContextAttributes} opt
	 * @throws {Error} WebGL がサポートされていません
	 */
	constructor(canvas, opt) {
		/** @type {WebGL2RenderingContext | WebGLRenderingContext} */
		this.gl = canvas.getContext("webgl2", opt) || canvas.getContext("webgl", opt);
		if (!this.gl) throw new Error("WebGL がサポートされていません");
		this.isWebGL2 = this.gl instanceof WebGL2RenderingContext;

		// WebGL 1.0 の場合、拡張機能を取得
		if (!this.isWebGL2) {
			this.vaoExt = this.gl.getExtension("OES_vertex_array_object");
		}
	}

	/**
	 * シェーダーを作成し、コンパイルする
	 * WebGL 2.0 の GLSL を WebGL 1.0 形式に変換する
	 * @param {number} type - シェーダーの種類 (gl.VERTEX_SHADER または gl.FRAGMENT_SHADER)
	 * @param {string} source - GLSL シェーダーのソースコード
	 * @returns {WebGLShader|null} コンパイルされたシェーダー (失敗時は null)
	 */
	createShader(type, source) {
		if (!this.isWebGL2) {
			source = source
				.replace("#version 300 es", "") // GLSL ES 3.0 ヘッダー削除
				.replace(/\bin\b/g, "attribute") // 'in' を 'attribute' に
				.replace(/\bout\b/g, "varying"); // 'out' を 'varying' に
		}

		const shader = this.gl.createShader(type);
		this.gl.shaderSource(shader, source);
		this.gl.compileShader(shader);

		if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
			console.error(this.gl.getShaderInfoLog(shader));
			this.gl.deleteShader(shader);
			return null;
		}
		return shader;
	}

	/**
	 * シェーダープログラムを作成する
	 * @param {string} vertexSource - 頂点シェーダーの GLSL コード
	 * @param {string} fragmentSource - フラグメントシェーダーの GLSL コード
	 * @returns {WebGLProgram|null} リンクされたプログラム (失敗時は null)
	 */
	createProgram(vertexSource, fragmentSource) {
		const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexSource);
		const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentSource);
		if (!vertexShader || !fragmentShader) return null;

		const program = this.gl.createProgram();
		this.gl.attachShader(program, vertexShader);
		this.gl.attachShader(program, fragmentShader);
		this.gl.linkProgram(program);

		if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
			console.error(this.gl.getProgramInfoLog(program));
			this.gl.deleteProgram(program);
			return null;
		}
		return program;
	}

	/**
	 * 頂点配列オブジェクト (VAO) を作成する
	 * WebGL 1.0 では拡張機能 "OES_vertex_array_object" を利用
	 * @returns {WebGLVertexArrayObjectOES | WebGLVertexArrayObject | null} 作成された VAO (失敗時は null)
	 */
	createVertexArray() {
		if (this.isWebGL2) {
			return this.gl.createVertexArray();
		} else if (this.vaoExt) {
			return this.vaoExt.createVertexArrayOES();
		}
		return null;
	}

	/**
	 * VAO をバインドする
	 * @param {WebGLVertexArrayObjectOES | WebGLVertexArrayObject | null} vao - バインドする VAO
	 * @returns {undefined}
	 */
	bindVertexArray(vao) {
		if (this.isWebGL2) {
			this.gl.bindVertexArray(vao);
		} else if (this.vaoExt) {
			this.vaoExt.bindVertexArrayOES(vao);
		}
	}
}
