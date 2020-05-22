import { Component, OnInit, ViewChild } from '@angular/core';
import { SuppliesService } from '../../services/suppplies.service';
import { MatTableDataSource } from '@angular/material/table';
import { MatStepper } from '@angular/material/stepper';
import { MatSort } from '@angular/material/sort';
import { DonateService } from '../../services';
import { SupplyModel, SuggestedPlaceToDonate, CreateDonation, Person } from '../../models';
import { ServiceEntityException } from '../../services/exceptions';

type FormData = {
  person: Person,
  orderId: string,
  supply: {
    id: string,
    quantity: number
  }
};

export interface SuggestionElement {
  position: number;
  name: string;
  address: string;
  distance: number;
  id: string
}

@Component({
  selector: 'app-donate',
  templateUrl: './donate.component.html',
  styleUrls: ['./donate.component.css']
})
export class DonateComponent implements OnInit {


  displayedColumns: string[] = ['selected', 'name', 'address', 'distance'];
  dataSource = new MatTableDataSource();

  /**
  Loaded supplies.
  */
  supplies: any;

  /**
  Form data provided by user.
  */
  form: FormData;

  /**
  true if there was an attemp to load suggestions and data was not found.
  */
  suggestionsNotFound: boolean;

  /**
  Tracking number given after a donation was created.
  */
  trackingNumber: string;

  /**
  Loading status of each step.
  */
  loading: {
    supplies: boolean,//true if supplies are loading, false otherwise.
    suggestions: boolean,//true if suggestions are loading, false otherwise
    submittingForm: boolean//true is forms is submitting to the server, false otherwise
  }

  /**
  Errors messages
  */
  errors: {
    supplies: string,//Supply error
    suggestions: string,//Suggestions error
    person: {//Persona error
      name: string,
      lastname: string,
      phoneNumber: string,
      postalCode: string,
      email: string,
      location: string,
      province: string,
      address: string
    },
    create: string[]//Errors creating donation
  }

  //Step status -> true = completed
  steps: {
    supply: boolean,//Supply has been selected and has quantity
    person: boolean,//Person data has is complete
    destination: boolean,//Destination has been selected
    created: boolean//Donation has been created
  }

  otherSupply: {
    name: string,
    quantity: number
  }

  @ViewChild(MatSort) sort: MatSort;

  constructor(
    private suppliesService: SuppliesService,
    private donateService: DonateService
    ) {

    this.suggestionsNotFound = false;
    this.trackingNumber = "";

    this.form = {
      orderId: '',
      supply: {
        id: '',
        quantity: 1
      },
      person: {
        email: '',
        lastname: '',
        name: '',
        phonePrefix: null,
        phoneNumber: null,
        address: {
          streetNumber: null,
          location: '',
          postalCode: null,
          province: '',
          street: '',
          department: ''
        }
      }
    };

    this.loading = {
      supplies: false,
      suggestions: false,
      submittingForm: false
    };

    this.steps = {
      supply: false,
      person: false,
      destination: false,
      created: false
    }

    this.errors = {
      supplies: "",
      suggestions: "",
      person: {
        phoneNumber: "",
        province: "",
        postalCode: "",
        name: "",
        lastname: "",
        email: "",
        location: "",
        address: ""
      },
      create: []
    }
   }


  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
  }

  ngOnInit(): void {
    /**
    Load supplies on init.
    */
    this.loadSupplies();
  }

  /**
  Loads available supplies.
  */
  private loadSupplies() {

    const onSuccess = (supplies: SupplyModel[]) => {
      this.supplies = supplies;
    };

    const onError = (error: any) => {
      this.errors.supplies = error.errors[0].general;
    };

    const onComplete = () => {
      this.loading.supplies = false;
    };

    this.loading.supplies = true;
    this.suppliesService.getAll().subscribe(onSuccess, onError, onComplete);
  }

  /**
  Submits form to the server.

  If fails, shows errors. If success, shows tracking number.
  */
  submit(onSuccess: () => void) {
    
    
    this.loading.submittingForm = true;

    const model: CreateDonation = new CreateDonation(
      this.form.orderId,
      this.form.person,
      [
        {
          quantity: this.form.supply.quantity,
          supplyId: this.form.supply.id
        }
      ]
    );


    const onError = error => {
      this.errors.create = error.getAllMessages();
    }

    const onComplete = () => {
      this.loading.submittingForm = false;
    }

    const onNext = result => {
      this.trackingNumber = result.tracking.number;
      onSuccess();
    }

    this.donateService.create(model).subscribe(
      onNext,
      onError,
      onComplete
    );
  }

  nextStep(stepper: MatStepper, currentStepNumber: number) {
    
    switch (currentStepNumber) {

      //Supply select step
      case 1:
        if (this.form.supply.id == "" || this.form.supply.quantity <= 0) {
          this.steps.supply = false;
          return;
        }

        this.steps.supply = true;
        stepper.next();
        break;

      //Personal data step
      case 2:
        let form = this.form.person;
        this.steps.person = form.address.street.trim() != "" &&
                        form.address.location.trim() != "" &&
                        form.email.trim() != "" &&
                        form.lastname.trim() != "" &&
                        form.name.trim() != "" &&
                        form.phonePrefix > 0 &&
                        form.phoneNumber > 0 &&
                        form.address.postalCode > 0 &&
                        form.address.province.trim() != "";

        if (this.steps.person) {
          this.addressChanged();
          stepper.next();
        }

        break;
      
      //Destination step.
      case 3:
        
        if (!!this.form.orderId && this.form.orderId.length > 0) {
          this.submit(() => {
            this.steps.destination = true;
            stepper.next();
          });
        }

        break;
    }
  }

  previousStep(stepper: MatStepper) {
    stepper.previous();
  }

  /**
  Address changes. Suggestions must be realoaded
  */
  addressChanged() {

    if (!this.steps.supply || !this.steps.person) {
      return;
    }
    
    //clear errors
    this.loading.suggestions = true;
    this.errors.suggestions = "";
    this.errors.create = [];
    this.suggestionsNotFound = false;

    //clear table
    this.dataSource = new MatTableDataSource();


    const person = this.form.person;
    const supplyId = this.form.supply.id;
    

    const onSuccess = (suggestions: SuggestedPlaceToDonate[]) => {

      //complete table with new data
      this.dataSource = new MatTableDataSource(
        suggestions.map((current, index): SuggestionElement => {
          return {
            position: index + 1,
            name: current.healthCenterName,
            address: current.address,
            distance: current.calculatedDistance,
            id: current.id
          }
        })
      );
      
      //check if there is data
      this.suggestionsNotFound = suggestions.length == 0;
    }

    const onError = error => {
      this.errors.suggestions = error;
    }

    const onComplete = () => {
      this.loading.suggestions = false;
    }

    this
    .donateService
    .getWhereToDonateSuggestions(
      supplyId,
      person.address.street,
      person.address.streetNumber,
      person.address.location,
      person.address.province
      )
    .subscribe(onSuccess, onError, onComplete);
  }
}