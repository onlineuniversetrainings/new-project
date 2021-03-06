function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj))
}

function extract(props, fromObj) {
    return props.reduce((extracted, prop) => {
        extracted[prop] = fromObj[prop]
        return extracted
    }, {})
}

function Store(obj) {
    var defaultStart = {
        id: '_start',
        text: [
            'Hello!! Welcome!',
            'Interactions start from here.',
            'Double-click this box to start customizing.'
        ],
        type: 'text',
        title: 'Start',
        position: {
            top: 20,
            left: 20
        }
    }
    obj = obj || {
        nodes: {
            _start: defaultStart
        }
    }
    var _store = deepClone(obj)

    function findChildNode(nodeId) {
        var [child, parent] = nodeId.split('@')
        return _store.nodes[parent].switches[nodeId]
    }

    var store = {
        get hero() {
            return deepClone(_store)
        },

        get edges() {
            var edges = []

            for (var key in _store.nodes) {
                var node = _store.nodes[key]

                if (node.type === 'buttons') {
                    var buttons = node.switches
                    for (var id in buttons) {
                        var button = buttons[id]
                        if (button.destination) edges.push({
                            source: button.id,
                            destination: button.destination
                        })
                    }
                }
                if (node.destination) edges.push({
                    source: node.id,
                    destination: node.destination
                })
            }

            return edges
        },

        getNode: function(nodeId) {
            return deepClone(_store.nodes[nodeId])
        },

        edgesFor: function(nodeId) {
            /* TO DO */ },

        modifyNode: function(modifiedNode) {
            _store.nodes[modifiedNode.id] = modifiedNode

            var changedNode = deepClone(modifiedNode)
            var affectedEdges = []
            var evt = new CustomEvent('node-modified', {
                detail: {
                    node: changedNode,
                    edges: affectedEdges
                }
            })
            window.dispatchEvent(evt)
        },

        modifyNodePosition: function(nodeId, newPosition) {
            var x = _store.nodes[nodeId]
            x.position = newPosition

            var changedNode = deepClone(x)
            var affectedEdges = []
            var evt = new CustomEvent('node-modified', {
                detail: {
                    node: changedNode,
                    edges: affectedEdges
                }
            })
            window.dispatchEvent(evt)
        },

        deleteNode: function(nodeId) {
            var linkedSources = this.edges.filter(({
                destination
            }) => destination === nodeId)
            linkedSources.forEach(this.deleteEdge)

            if (nodeId === '_start') {
                var position = deepClone(_store.nodes[nodeId].position)
                _store.nodes[nodeId] = defaultStart
                _store.nodes[nodeId].position = position
            } else {
                delete _store.nodes[nodeId]
            }

            var evt = new CustomEvent('node-deleted', {
                detail: {
                    node: nodeId
                }
            })
            window.dispatchEvent(evt)
        },

        addEdge: function(obj) {
            var sourceNode = obj.source.includes('@') ? findChildNode(obj.source) : _store.nodes[obj.source];
            sourceNode.destination = obj.destination

            var evt = new CustomEvent('edge-added', {
                detail: {
                    edge: obj
                }
            });
            window.dispatchEvent(evt)
        },

        deleteEdge: function(obj) {
            var node = obj.source.includes('@') ? findChildNode(obj.source) : _store.nodes[obj.source]
            delete node.destination

            var evt = new CustomEvent('edge-deleted', {
                detail: {
                    edge: obj
                }
            })
            window.dispatchEvent(evt)
        }
    };

    window.dispatchEvent(new CustomEvent('store-created', {
        detail: {
            store: deepClone(store)
        }
    }))

    return store
};

(function() {


    var canvas = document.getElementById('canvas')
    var svg = canvas.getElementsByClassName('all-links')[0]
    var interactionsUI = document.querySelector('#canvas .interactions')
    var addInteraction = document.querySelector('.create-interaction ._new')

    function positionOnCanvas(point) {
        var rect = canvas.getBoundingClientRect();
        return [(point[0] - rect.left), (point[1] - rect.top)];
    }

    function positionOfHook(el) {
        var elBcr = el.getBoundingClientRect();
        return positionOnCanvas(
            [(elBcr.left + (elBcr.width / 2)),
                (elBcr.top + (elBcr.height / 2))
            ]
        )
    }

    function constructPathId(edge) {
        return edge.source + '-' + edge.destination
    }

    function createSVGElement(x, attrs) {
        var ns = 'http://www.w3.org/2000/svg';

        var element = document.createElementNS(ns, x);
        if (attrs) {
            for (var attr in attrs) element.setAttribute(attr, attrs[attr])
        }
        return element
    }

    function bezierCurveBetween(start, end) {
        var cp1 = [start[0] + 100, start[1]];
        var cp2 = [end[0] - 100, end[1]];

        return `M${start[0]},${start[1]} C ${cp1[0]},${cp1[1]} ${cp2[0]},${cp2[1]} ${end[0]},${end[1]}`;
    }

    function drawPath(pathElement, start, end) {
        if (!pathElement) pathElement = createSVGElement('path', {
            class: '_link',
            tabindex: 0
        });
        pathElement.setAttribute('d', bezierCurveBetween(start, end));
        return pathElement;
    }

    function getById(selector) {
        return document.getElementById(selector);
    }

    function sourceHookOfElement(target) {
        var x = target.matches('._hook.-source') ? target : target.querySelectorAll('._hook.-source');

        if (x.length !== undefined) { // If true, receivingHook is a NodeList and not an element.
            if (x.length !== 1) { // If length == 0, there is no hook. If length > 1, there are multiple
                return null // receivingHooks, which means there is no clear target hook. So we return null.
            } else {
                x = x[0]
            }
        }

        return x;
    }

    function destinationHookOfElement(element) {
        if (element) {
            return element.matches('._hook.-destination') ? element : element.querySelector('._hook.-destination')
        }
    }

    function sourceHookPositionOfEdge(edge) {
        return positionOfHook(sourceHookOfElement(getById(edge.source)))
    }

    function destinationHookPositionOfEdge(edge) {
        return positionOfHook(destinationHookOfElement(getById(edge.destination)))
    }

    function hookPositionsOfEdge(edge) {
        return [sourceHookPositionOfEdge(edge), destinationHookPositionOfEdge(edge)];
    }






    (function() {
        var templates = {
            buttons: function(node) {
                var buttons = node.switches
                var str = '';
                for (var key in buttons) {
                    var button = buttons[key]
                    str = str + templates[button.type](button)
                }

                var str2 = "";
                node.text.forEach(function(text) {
                    str2 = str2 + "<p>" + text + "</p>";
                });

                return "<div class='has-hook interaction -buttons' tabindex=0 id=" + node.id + " style='top:" + node.position.top + "px; left:" + node.position.left + "px'><div class='_title'>" + node.title + "</div><div class='_text-msgs'>" + str2 + "</div><div class='_elements'>" +
                    str +
                    "</div><div class='_hook -destination'></div></div>";
            },
            button: function(btn) {
                return "<div class='has-hook _switch' id=" + btn.id + ">" + btn.title + "<div class='_hook -source'></div></div>";
            },
            form: function(node) {
                var str = [];
                node.form.forEach(function(field) {
                    str.push(field.placeholder);
                });
                str = str.join(', ');

                var str2 = "";
                node.text.forEach(function(text) {
                    str2 = str2 + "<p>" + text + "</p>";
                });

                return "<div class='has-hook interaction -form' tabindex=0 id=" + node.id + " style='top:" + node.position.top + "px; left:" + node.position.left + "px'><div class='_title'>" + node.title + "</div><div class='_text-msgs'>" + str2 + "</div><div class='_fields'>" +
                    str +
                    "</div><div class='_hook -destination'></div><div class='_hook -source'></div></div>";
            },
            text: function(node) {
                var str = "";
                node.text.forEach(function(text) {
                    str = str + "<p>" + text + "</p>";
                });
                return "<div class='interaction has-hook' tabindex=0 id=" + node.id + " style='top:" + node.position.top + "px; left:" + node.position.left + "px'><div class='_title'>" + node.title + "</div><div class='_content'>" + str + "</div><div class='_hook -destination'></div><div class='_hook -source'></div></div>";
            }
        };

        function showNode(data) {
            if (data.parentNode !== undefined) return;

            if (templates[data.type]) {
                interactionsUI.insertAdjacentHTML('beforeend', templates[data.type](data));
            }
        }

        function showEdge(data) {
            var path = drawPath.apply(null, [null].concat(hookPositionsOfEdge(data)));
            path.id = constructPathId(data);
            svg.appendChild(path);

            sourceHookOfElement(getById(data.source)).classList.add('-engaged');
        }

        function renderAll(store) {
            var hero = store.hero,
                nodes = hero.nodes

            for (var key in nodes) showNode(nodes[key])
            store.edges.forEach(showEdge)
        }

        window.addEventListener('store-created', function(e) {
            renderAll(e.detail.store)
        })


        var save_api = (function(interactions_data) {
            var allowedToSaveInteractionData = true,
                latestData;

            function send(interactions_data) {
                $.ajax({
                    url: save_interactions_url,
                    method: 'POST',
                    data: {
                        csrfmiddlewaretoken: csrf_token,
                        interactions: JSON.stringify(interactions_data)
                    },
                    success: function() {
                        if (latestData) {
                            send(latestData)
                        } else {
                            allowedToSaveInteractionData = true
                        }
                    }
                })
                latestData = null
            }

            return function(interactions_data) {
                latestData = interactions_data

                if (allowedToSaveInteractionData) {
                    console.group('LATEST DATA:')
                    console.log(JSON.stringify(latestData))
                    console.groupEnd()
                    send(latestData)
                    allowedToSaveInteractionData = false
                }
            }
        })();


        ['node-added', 'node-modified', 'node-deleted', 'edge-deleted', 'edge-added'].forEach(function(event) {
            window.addEventListener(event, function() {
                interactionsUI.innerHTML = '';
                svg.innerHTML = ''
                renderAll(store)
                save_api(store.hero)
            })
        })

        /*window.addEventListener('node-added', function(e){
          e.detail.nodes.forEach(showNode);
        });

        window.addEventListener('node-modified', function(e){
          var nodeId = e.detail.node.id,
              node = getById(nodeId),
              edges = e.detail.edges;

          node.parentElement.removeChild(node);
          showNode(e.detail.node);
          edges.forEach(function(edge){
            svg.removeChild(getById(constructPathId(edge)));
            showEdge(edge);
          });
        });

        window.addEventListener('node-deleted', function(e){
          var node = getById(e.detail.node)
          node.parentElement.removeChild(node);
        });

        window.addEventListener('edge-deleted', function(e){
          var link = getById(constructPathId(e.detail.edge))
          if(link){
            svg.removeChild(link)
          }
          sourceHookOfElement(getById(e.detail.edge.source)).classList.remove('-engaged');
        });

        window.addEventListener('edge-added', function(e){
          showEdge(e.detail.edge);
        });*/
    })();


    (function() {
        var templates = {
            header: function(title, type) {
                return `<header class="-pad-1">
        <label>
          Title
          <input type=text name=interaction-name value="${title}"  />
        </label>
        <label>
          <span class="sr-only">Select user input type</span>
          <select class="_edit-node-type" onchange="this.closest('dialog').dataset.type = this.value">
            <option>--Select option--</option>
            <option value="text" ${(type === 'text') ? 'selected' : ''}>Text</option>
            <option value="form" ${(type === 'form') ? 'selected' : ''}>Form</option>
            <option value="buttons" ${(type === 'buttons') ? 'selected' : ''}>Button</option>
          </select>
        </label>
      </header>`
            },
            botMessage: function(text) {
                return `<div class="_bot-message-wrapper">
        <input type="text" class="_bot-message" placeholder="Bot messages" value="${text || ''}"><button type="button" onclick="var p = this.closest('._bot-message-wrapper'); p.parentElement.removeChild(p)">&times;</button>
      </div>`
            },
            textMessages: function(arr = ['']) {
                var msgs = ''
                arr.forEach(function(text) {
                    msgs += this.botMessage(text)
                }, this)

                return `<section class="_bot-messages-section -pad-1 -pad-r-0">
        <div class="_bot-messages">${msgs}</div>
        <button type="button" name="_add-text" onclick="this.previousElementSibling.insertAdjacentHTML('beforeend', this.nextElementSibling.innerHTML)">Add message bubble</button>
        <div style="display:none">${this.botMessage()}</div>
      </section>`
            },
            formField: function(obj) {
                var field = obj || {
                    label: '',
                    placeholder: '',
                    type: 'text'
                }

                var types = {
                    text: false,
                    email: false,
                    tel: false
                }
                types[field.type] = true
                var optionsHTML = '';
                for (let type in types) {
                    optionsHTML = optionsHTML + `<option value="${type}" ${types[type] ? 'selected' : ''}>${type}</option>`
                }
                return `<fieldset>
        <span>
          <label>
            Label <input type="text" name="label" value="${field.label}" placeholder="${field.placeholder}">
          </label><label>
            field type <select class="" name="type">${optionsHTML}</select>
          </label><label>
            Helper text <input type="text" name="placeholder" value="${field.placeholder}" placeholder="${field.placeholder}">
          </label><label>
            <button type="button" aria-label="cancel" onclick="var p = this.closest('fieldset'); p.parentElement.removeChild(p)">&times;</button>
          </label>
        </span>
      </fieldset>`
            },
            button: function(obj) {
                obj = obj || {
                    id: '',
                    title: '',
                    payload: ''
                }

                return `<fieldset>
        <span>
          <label>
            button title
            <input type="text" data-id="${obj.id}" name="${obj.payload}" value="${obj.title}" placeholder="Enter a title">
          </label><label>
            <button type="button" aria-label="cancel" onclick="var p = this.closest('fieldset'); p.parentElement.removeChild(p)">&times;</button>
          </label>
        </span>
      </fieldset>`
            },
            dialog: function(title, type, msgs, formFields, buttons) {
                return `<dialog class="add-or-edit-interaction-modal" data-type="${type}">
          <form method="dialog">
            ${this.header(title, type)}
            ${msgs}
            <section class="_form-and-buttons-section -pad-1 -pad-r-0">
              <section class="_define-form">
                <div class="_form-fields">${formFields}</div>
                <button type="button" class="_add-field" onclick="this.previousElementSibling.insertAdjacentHTML('beforeend', this.nextElementSibling.innerHTML)">Add field</button>
                <div style="display:none">${this.formField()}</div>
              </section>
              <section class="_define-buttons">
                <div class="_buttons">${buttons}</div>
                <button type="button" class="_add-button" onclick="this.previousElementSibling.insertAdjacentHTML('beforeend', this.nextElementSibling.innerHTML)">Add a button</button>
                <div style="display:none">${this.button()}</div>
              </section>
            </section>
            <div class="_save-or-cancel">
              <button type="submit" class="_save">Save</button>
              <button type="button" class="_cancel">Cancel</button>
            </div>
          </form>
        </dialog>`
            },
            addInteraction: function() {
                var title = '',
                    type = 'form',
                    msgs = this.textMessages(),
                    formFields = this.formField(),
                    buttons = this.button()

                return this.dialog(title, type, msgs, formFields, buttons)
            },
            form: function({
                text,
                type,
                form,
                title
            }) {
                var msgs = this.textMessages(text || ['']),
                    formFields = (function() {
                        var x = ''
                        form.forEach(field => x += templates.formField(field))
                        return x
                    })(),
                    buttons = ''

                return this.dialog(title, type, msgs, formFields, buttons)
            },
            buttons: function({
                text,
                type,
                switches,
                title
            }) {
                var msgs = this.textMessages(text || ['']),
                    formFields = '',
                    buttons = (function() {
                        var x = ''
                        for (var key in switches) {
                            x += templates.button(switches[key])
                        }
                        return x
                    })()

                return this.dialog(title, type, msgs, formFields, buttons)
            },
            text: function({
                text,
                type,
                title
            }) {
                var msgs = this.textMessages(text || ['']),
                    formFields = '',
                    buttons = '';

                return this.dialog(title, type, msgs, formFields, buttons)
            }
        }

        function extractTextMsgs(form) {
            var inputs = form.querySelectorAll('._bot-messages-section input')
            return [...inputs].map(input => input.value).filter(x => x)
        }

        function extractButtons(form) {
            var inputs = form.querySelectorAll('._define-buttons input')
            return [...inputs].filter(input => input.value)
                .map(input => ({
                    id: input.dataset.id,
                    title: input.value
                }))
        }

        function extractFormFields(form) {
            var inputs = form.querySelectorAll('._define-form fieldset')
            return [...inputs].map(field => [...field.querySelectorAll('input,select')]
                    .reduce((acc, el) => {
                        acc[el.name] = el.value;
                        return acc
                    }, {}))
                .slice(0, -1)
        }

        var currentNode

        window.addEventListener('submit', function(e) {
            if (!e.target.matches('dialog.add-or-edit-interaction-modal form')) return
            e.preventDefault()

            var form = e.target,
                type = form.getElementsByClassName('_edit-node-type')[0].value,
                modifiedNode

            if (type === 'buttons') {
                var switches = currentNode.switches || {},
                    btns = extractButtons(form).map((button, i) =>
                        ({
                            type: 'button',
                            id: button.id || (Date.now() + i).toString(36) + '@' + currentNode.id,
                            title: button.title,
                            payload: '/' + button.title.split(' ').join('-').toLowerCase(),
                            destination: switches[button.id] ? switches[button.id].destination : null
                        })
                    )

                modifiedNode = {
                    id: currentNode.id,
                    title: form.querySelector('[name=interaction-name]').value,
                    position: currentNode.position || {
                        top: 80,
                        left: 80
                    },
                    type: type,
                    text: extractTextMsgs(form),
                    switches: btns.reduce((acc, btn) => {
                        acc[btn.id] = btn
                        return acc
                    }, {})
                }
                console.log(modifiedNode)
            }

            if (type === 'form') {
                currentNode.type = type
                currentNode.title = form.querySelector('[name=interaction-name]').value
                currentNode.form = extractFormFields(form)
                currentNode.text = extractTextMsgs(form)
                modifiedNode = currentNode
            }

            if (type === 'text') {
                currentNode.type = type
                currentNode.title = form.querySelector('[name=interaction-name]').value
                currentNode.text = extractTextMsgs(form)
                modifiedNode = currentNode
            }

            store.modifyNode(modifiedNode)
            var dialog = form.closest('dialog.add-or-edit-interaction-modal')
            dialog.parentElement.removeChild(dialog)
        })

        addInteraction.addEventListener('click', function() {
            document.body.insertAdjacentHTML('beforeend', templates.addInteraction())
            var x = document.body.children
            x[x.length - 1].showModal()
            currentNode = {
                id: Date.now().toString(36),
                position: {
                    top: 80,
                    left: 80
                },
                text: []
            }
        })

        interactionsUI.addEventListener('dblclick', function({
            target
        }) {
            if (!target.matches('.interaction, .interaction *')) return

            var node = store.getNode(target.closest('.interaction').id)
            var dialog = document.createRange()
                .createContextualFragment(templates[node.type](node))
                .firstChild
            document.body.appendChild(dialog)
            dialog.showModal()
            dialog.onclose = () => dialog.parentElement.removeChild(dialog)

            currentNode = node
        })

        interactionsUI.addEventListener('mousedown', function(e) {
            var t = e.target
            if (t.matches('.interaction, .interaction *') && !t.matches('._hook')) {
                t.closest('.interaction').setAttribute('draggable', 'true')
            }
        });

        interactionsUI.addEventListener('mouseup', function(e) {
            var t = e.target
            if (t.matches('.interaction, .interaction *') && !t.matches('._hook')) {
                t.closest('.interaction').setAttribute('draggable', 'false')
            }
        });

        canvas.addEventListener('dragstart', function(e) {
            if (!e.target.matches('.interaction')) return;
            var t = e.target,
                tBcr = t.getBoundingClientRect();

            var data = {
                id: t.id,
                offsets: [(e.clientX - tBcr.left), (e.clientY - tBcr.top)]
            }
            e.dataTransfer.setData('text/plain', JSON.stringify(data))
        });

        canvas.addEventListener('dragover', function(e) {
            e.preventDefault();
        });

        canvas.addEventListener('drop', function(e) {
            e.preventDefault();

            var {
                id,
                offsets: [X, Y]
            } = JSON.parse(e.dataTransfer.getData('text/plain')),
                [dropX, dropY] = positionOnCanvas([e.clientX, e.clientY]),
                left = dropX - Number(X),
                top = dropY - Number(Y);

            store.modifyNodePosition(id, {
                top: Math.max(0, top),
                left: Math.max(0, left)
            });
        });

        window.addEventListener('keypress', function(e) {
            var edge, link = e.target;
            if (!link.matches('path._link')) return;

            if (e.key === 'Delete' || e.keyCode == 127) {
                edge = link.id.split('-');
                store.deleteEdge({
                    source: edge[0],
                    destination: edge[1]
                });
            }
        });

        window.addEventListener('keypress', function(e) {
            var node, interaction = e.target;
            if (!interaction.matches('.interaction')) return;

            if (e.key === 'Delete' || e.keyCode == 127) {
                store.deleteNode(interaction.id);
            }
        });

        function deletePath(path) {
            if (path) svg.removeChild(path);
            return path;
        }

        function mdOnPath(e) {
            if (!e.target.matches('.interaction ._hook')) return;
            if (e.target.matches('.interaction ._hook.-source.-engaged')) return;

            var t = e.target,
                path = createSVGElement('path', {
                    class: '_link'
                }),
                startedAtSource = t.matches('.-source') ? true : false,
                sendingNode = t.closest('.has-hook'),
                sendingInteraction = t.closest('.interaction'),
                edge = [sendingNode.id],
                b = positionOfHook(t);

            svg.appendChild(path);

            function makepath(path, startedAtSource, b, e) {
                var points = [b, positionOnCanvas([e.clientX, e.clientY])];
                if (!startedAtSource) points.reverse();

                drawPath(path, points[0], points[1]);
            };

            var makepath2 = makepath.bind(null, path, startedAtSource, b);

            document.addEventListener('mousemove', makepath2);
            document.addEventListener('mouseup', function a(e) {
                document.removeEventListener('mousemove', makepath2);
                document.removeEventListener('mouseup', a);

                deletePath(path);
                var dropTarget = e.target,
                    receivingHook = startedAtSource ? destinationHookOfElement(dropTarget) : sourceHookOfElement(dropTarget),
                    receivingNode = receivingHook.closest('.has-hook'),
                    receivingInteraction = receivingHook.closest('.interaction');

                if (!path.getAttribute('d') ||
                    !dropTarget.matches('.interaction, .interaction *') ||
                    !receivingHook ||
                    receivingHook.classList.contains('-engaged') ||
                    receivingInteraction === sendingInteraction) {
                    return;
                }

                edge.push(receivingNode.id);
                if (!startedAtSource) edge.reverse();

                store.addEdge({
                    source: edge[0],
                    destination: edge[1]
                });
            });
        }

        canvas.addEventListener('mousedown', mdOnPath)
        /*canvas.addEventListener('mousedown', function(e){
          if (!e.target.matches('.all-links')) return

          var nodes = [...interactionsUI.children]
                            .map(child => child.getBoundingClientRect())
                            .map(rect => ({
                                  y: rect.bottom,
                                  x: rect.right
                                }))
                            .reduce((acc, position, i, arr) => {
                              return {
                                y: Math.max(acc.y, position.y),
                                x: Math.max(acc.x, position.x)
                              }
                            } , {y:0, x:0})
          console.log('Occupied: ', nodes)
          var {width, height} = canvas.parentElement.getBoundingClientRect()
          var canvasViewport = {height, width}
          console.log('canvasViewport: ', canvasViewport)
          console.log()
        })*/
    })();

})();