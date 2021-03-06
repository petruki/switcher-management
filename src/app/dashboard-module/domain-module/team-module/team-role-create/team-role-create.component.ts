import { Component, OnInit, OnDestroy, Inject, ViewChild } from '@angular/core';
import { Subject } from 'rxjs';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { takeUntil } from 'rxjs/operators';
import { ToastService } from 'src/app/_helpers/toast.service';
import { ConsoleLogger } from 'src/app/_helpers/console-logger';
import { MatSelectionList } from '@angular/material/list';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { RoleService } from 'src/app/services/role.service';
import { Role } from 'src/app/model/role';

@Component({
  selector: 'app-team-role-create',
  templateUrl: './team-role-create.component.html',
  styleUrls: [
    '../../common/css/detail.component.css',
    '../../common/css/create.component.css',
    './team-role-create.component.css'
  ]
})
export class TeamRoleCreateComponent implements OnInit, OnDestroy {
  private unsubscribe: Subject<void> = new Subject();

  routers: string[] = [];
  actions: string[] = [];
  key: string;
  validKeyOnly: boolean;

  strategySelected: string;

  elementCreationFormGroup: FormGroup;

  routerFormControl = new FormControl('', [
    Validators.required
  ]);

  actionFormControl = new FormControl('', [
    Validators.required
  ]);
  
  valueSelectionFormControl = new FormControl('', [
    Validators.required
  ]);

  @ViewChild(MatSelectionList, { static: true })
  private componentValueSelection: MatSelectionList;

  constructor(
    public dialogRef: MatDialogRef<TeamRoleCreateComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private roleService: RoleService,
    private formBuilder: FormBuilder,
    private toastService: ToastService
  ) { }

  ngOnInit() {
    this.loadRouter();
    this.loadActions();

    this.elementCreationFormGroup = this.formBuilder.group({
      routerFormControl: this.routerFormControl,
      actionFormControl: this.actionFormControl
    });

    this.routerFormControl.valueChanges.pipe(takeUntil(this.unsubscribe)).subscribe(value => {
      this.data.router = value;
      this.roleService.getKeysByRouter(value).pipe(takeUntil(this.unsubscribe)).subscribe(value => {
        if (value) {
          this.key = value.key;
          this.validKeyOnly = true;
        }
      }, error => {
        this.validKeyOnly = false;
        this.valueSelectionFormControl.setValue(null);
        this.data.values = [];
      });
    });

    this.actionFormControl.valueChanges.pipe(takeUntil(this.unsubscribe)).subscribe(value => {
      this.data.action = value;
    });
  }

  ngOnDestroy() {
    this.unsubscribe.next();
    this.unsubscribe.complete();
  }

  loadRouter(): void {
    this.roleService.getRoleRouters().pipe(takeUntil(this.unsubscribe)).subscribe(routers => {
      if (routers) {
        this.routers = routers.routersAvailable;
        if (this.data.router) {
          this.routerFormControl.setValue(this.data.router);
        }
      }
    }, error => {
      ConsoleLogger.printError(error);
    });
  }

  loadActions(): void {
    this.roleService.getRoleActions().pipe(takeUntil(this.unsubscribe)).subscribe(actions => {
      if (actions) {
        this.actions = actions.actionsAvailable;
        if (this.data.action) {
          this.actionFormControl.setValue(this.data.action);
        }
      }
    }, error => {
      ConsoleLogger.printError(error);
    });
  }

  addValue(newValue: string) {
    const { valid } = this.valueSelectionFormControl;
    if (valid) {
      if (this.data.values && !this.data.values.includes(newValue)) {
        this.data.values.push(newValue);
      } else {
        this.data.values = [newValue];
      }
    }
  }

  removeValue(value: string) {
    this.data.values.splice(this.data.values.indexOf(value), 1);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(data: any) {
    const { valid } = this.elementCreationFormGroup;

    if (valid && this.validateData(data)) {
      this.loadIdentifiedBy();
      this.dialogRef.close(data);
    }      
  }

  validateData(data: any): boolean {
    // When editing
    if (this.data.role) {
      return true;
    }

    const foundRole = this.data.roles.filter((role: Role) => 
      role.router === data.router || role.router === 'ALL' || data.router === 'ALL');
    const foundRoleAction = foundRole.filter((role: Role) => role.action === data.action || role.action === 'ALL');

    if (foundRoleAction.length) {
      this.toastService.showError(`This role has conflicted with an existing role: ${foundRoleAction[0].router} - ${foundRoleAction[0].action}`);
      return false;
    }

    return true;
  }

  loadIdentifiedBy(): void {
    if (this.data.values.length) {
      this.data.identifiedBy = this.key;
    } else {
      this.data.identifiedBy = '';
      this.data.values = [];
    }
  }

}
