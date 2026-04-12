export class SluggableNotInitializedException extends Error {
  constructor() {
    super(
      "SluggableModule has not been initialized. Make sure SluggableModule.forRoot() is imported.",
    );
    this.name = "SluggableNotInitializedException";
  }
}
