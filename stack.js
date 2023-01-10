export class Stack {

    constructor()
    {
        this.items = [];
    }

    push(element)
    {
        this.items.push(element);
    }

    pop()
    {

        if (this.items.length == 0)
            return "Underflow";
        return this.items.pop();
    }

    length()
    {
        return this.items.length;
    }

    peek()
    {

        return this.items[this.items.length - 1];
    }

    reverseStack()
    {
        this.items.reverse();
        const reversed = [...this.items];
        this.items.reverse();
        return reversed;
    }

}




 