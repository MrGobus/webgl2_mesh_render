class App {

	/**
	 * Конструктор
	 * @param {JSON} meshJSON - JSON описывающий меш
	 */

	constructor(meshJSON) {

		// Создаем канву

		this.canvas = document.createElement("canvas")
		this.canvas.width = 512
		this.canvas.height = 512

		// Получаем контекст

		this.context = this.canvas.getContext("webgl2", {alpha: false})

		let gl = this.context

		// Шейдер

		let vertexShader = gl.createShader(gl.VERTEX_SHADER)
		gl.shaderSource(vertexShader, [

			"#version 300 es",

			"layout (location = 0) in vec3 vertexPosition;",
			"layout (location = 1) in vec3 vertexNormal;",
			"layout (location = 2) in vec2 vertexUV;",

			"uniform mat4 modelviewMatrix;",
			"uniform mat4 projectionMatrix;",

			"out vec4 fragNormal;",
			"out vec4 fragPosition;",

			"void main() {",
				"fragNormal = modelviewMatrix * vec4(vertexNormal, 1);",
				"fragPosition = modelviewMatrix * vec4(vertexPosition, 1);",
				"gl_Position = projectionMatrix * fragPosition;",
			"}"

		].join("\n"))
		gl.compileShader(vertexShader)
		if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
			throw("vertex shader compile error:\n" + gl.getShaderInfoLog(vertexShader))
		}

		let fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)
		gl.shaderSource(fragmentShader, [

			"#version 300 es",

			"precision highp float;",

			"in vec4 fragNormal;",
			"in vec4 fragPosition;",

			"uniform struct {",
				"vec4 position;",
			"} light;",

			"out vec4 color;",

			"void main() {",

				"vec4 normal = normalize(fragNormal);",
				"vec4 lightDirection = normalize(light.position - fragPosition);",

				"float diffuse = dot(normal, lightDirection);",
				"if (diffuse < 0.0) diffuse = 0.0;",

				"color = vec4(1, 1, 1, 1) * diffuse;",

			"}"

		].join("\n"))
		gl.compileShader(fragmentShader)
		if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
			throw("fragment shader compile error:\n" + gl.getShaderInfoLog(fragmentShader))
		}

		this.shaderProgram = gl.createProgram()
		gl.attachShader(this.shaderProgram, vertexShader)
		gl.attachShader(this.shaderProgram, fragmentShader)
		gl.linkProgram(this.shaderProgram)
		if (!gl.getProgramParameter(this.shaderProgram, gl.LINK_STATUS)) {
			throw "shader program link error:\n" + gl.getProgramInfoLog(shaderProgram)
		}

		gl.useProgram(this.shaderProgram)

		this.uniformLocation = {
			modelviewMatrix: gl.getUniformLocation(this.shaderProgram, "modelviewMatrix"),
			projectionMatrix: gl.getUniformLocation(this.shaderProgram, "projectionMatrix")
		}

		// Матрица проекции

		let fovy = 45.0
		let aspect = 1.0
		let near = 0.0001
		let far = 1000.0
		let nf = near - far
		let f = 1 / Math.tan(fovy / 2)

		let multMatrix = function(m0, m1) {
			return new Float32Array([
				m0[ 0] * m1[ 0] + m0[ 4] * m1[ 1] + m0[ 8] * m1[ 2] + m0[12] * m1[ 3],
				m0[ 1] * m1[ 0] + m0[ 5] * m1[ 1] + m0[ 9] * m1[ 2] + m0[13] * m1[ 3],
				m0[ 2] * m1[ 0] + m0[ 6] * m1[ 1] + m0[10] * m1[ 2] + m0[14] * m1[ 3],
				m0[ 3] * m1[ 0] + m0[ 7] * m1[ 1] + m0[11] * m1[ 2] + m0[15] * m1[ 3],
				m0[ 0] * m1[ 4] + m0[ 4] * m1[ 5] + m0[ 8] * m1[ 6] + m0[12] * m1[ 7],
				m0[ 1] * m1[ 4] + m0[ 5] * m1[ 5] + m0[ 9] * m1[ 6] + m0[13] * m1[ 7],
				m0[ 2] * m1[ 4] + m0[ 6] * m1[ 5] + m0[10] * m1[ 6] + m0[14] * m1[ 7],
				m0[ 3] * m1[ 4] + m0[ 7] * m1[ 5] + m0[11] * m1[ 6] + m0[15] * m1[ 7],
				m0[ 0] * m1[ 8] + m0[ 4] * m1[ 9] + m0[ 8] * m1[10] + m0[12] * m1[11],
				m0[ 1] * m1[ 8] + m0[ 5] * m1[ 9] + m0[ 9] * m1[10] + m0[13] * m1[11],
				m0[ 2] * m1[ 8] + m0[ 6] * m1[ 9] + m0[10] * m1[10] + m0[14] * m1[11],
				m0[ 3] * m1[ 8] + m0[ 7] * m1[ 9] + m0[11] * m1[10] + m0[15] * m1[11],
				m0[ 0] * m1[12] + m0[ 4] * m1[13] + m0[ 8] * m1[14] + m0[12] * m1[15],
				m0[ 1] * m1[12] + m0[ 5] * m1[13] + m0[ 9] * m1[14] + m0[13] * m1[15],
				m0[ 2] * m1[12] + m0[ 6] * m1[13] + m0[10] * m1[14] + m0[14] * m1[15],
				m0[ 3] * m1[12] + m0[ 7] * m1[13] + m0[11] * m1[14] + m0[15] * m1[15]
			])
		}

		gl.uniformMatrix4fv(this.uniformLocation.projectionMatrix, false, new Float32Array(multMatrix(
			[
				f / aspect, 0, 0, 0,
				0, f, 0, 0,
				0, 0, (far + near) / nf, -1,
				0, 0, (2 * far * near) / nf, 0
			],
			[
				1, 0, 0, 0,
				0, 1, 0, 0,
				0, 0, 1, 0,
				0, 0, -2, 1
			]

		)))


		// Вершинный буфер

		this.vertexArray = gl.createVertexArray()
		gl.bindVertexArray(this.vertexArray)

		// Устанавливаем данные меша

		// Формируем буфер вершин

		let buffer = new ArrayBuffer(meshJSON.vertices.length * 32)

		for (let i = 0; i < meshJSON.vertices.length; i++) {
			let vertex = meshJSON.vertices[i]
			let fptr = new Float32Array(buffer, i * 32, 8)
			fptr[0] = vertex.x || 0
			fptr[1] = vertex.y || 0
			fptr[2] = vertex.z || 0
			fptr[3] = vertex.nx || 0
			fptr[4] = vertex.ny || 0
			fptr[5] = vertex.nz || 0
			fptr[6] = vertex.u || 0
			fptr[7] = vertex.v || 0
		}

		// Вершины

		this.verticesCount = meshJSON.vertices.length

		this.verticesBuffer = gl.createBuffer()
		gl.bindBuffer(gl.ARRAY_BUFFER, this.verticesBuffer)
		gl.bufferData(gl.ARRAY_BUFFER, buffer, gl.STATIC_DRAW)

		gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0)
		gl.enableVertexAttribArray(0)

		gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 12)
		gl.enableVertexAttribArray(1)

		gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 32, 24)
		gl.enableVertexAttribArray(2)

		// Индексы

		this.indicesCount = meshJSON.indices.length

		this.indicesBuffer = gl.createBuffer()
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indicesBuffer)
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(meshJSON.indices), gl.STATIC_DRAW)

		//

		gl.enable(gl.DEPTH_TEST)

		// Свет

		gl.uniform4fv(gl.getUniformLocation(this.shaderProgram, "light.position"), new Float32Array([10, 10, 10, 1]))

	}

	/**
	 * Рисует кадр сцены
	 */

	renderFrame() {

		let gl = this.context

		// Очиска экрана

		gl.clearColor(0.2, 0.2, 0.2, 1.0)
		gl.clear(gl.COLOR_BUFFER_BIT || gl.DEPTH_BUFFER_BIT)

		// Крутим

		this.angle = new Date().getTime() / 1000

		let nx = 0
		let ny = 1
		let nz = 0

		let c = Math.cos(this.angle);
		let s = Math.sin(this.angle);
		let c1 = 1 - c;

		let xs = nx * s;
		let ys = ny * s;
		let zs = nz * s;

		let xy = nx * ny * c1;
		let xz = nx * nz * c1;
		let yz = ny * nz * c1;

		gl.uniformMatrix4fv(this.uniformLocation.modelviewMatrix, false, new Float32Array([
			nx * nx * c1 + c, xy + zs, xz - ys, 0,
			xy - zs, ny * ny * c1 + c, yz + xs, 0,
			xz + ys, yz - xs, nz * nz * c1 + c, 0,
			0, 0, 0, 1
		]))

		// Рисуем меш

		gl.bindVertexArray(this.vertexArray)
		gl.drawElements(gl.TRIANGLES, this.indicesCount, gl.UNSIGNED_SHORT, 0)

	}

	play() {
		let p = ()=>{this.play()}
		requestAnimationFrame(p)
		this.renderFrame()
	}

}

/**
 * Загрузка JSON
 * @param {string} url - урл файла
 * @param {Function} callback  - функция вызваемая при успешной загрузке
 */

function loadJSON(url, callback) {
	req = new XMLHttpRequest()
	req.open("GET", url, true)
	req.overrideMimeType("application/json")
	req.onreadystatechange = function() {
		if (req.readyState == 4 && req.status == "200") {
			callback(JSON.parse(req.responseText))
		}
	}
	req.send()
}

/**
 * Запуск приложения
 */

window.onload = function() {
	loadJSON("./data/Monkey.json", function(meshJSON){
		let app = new App(meshJSON)
		document.body.appendChild(app.canvas)
		app.play()
	})
}
